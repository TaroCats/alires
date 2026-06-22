from __future__ import annotations

import json
import socket
import time
from dataclasses import dataclass
from typing import Any

from api.config import settings
from api.models import CloudAccount, InstancePolicy

try:
    from aliyunsdkcore.client import AcsClient
    from aliyunsdkcore.request import CommonRequest
    from aliyunsdkecs.request.v20140526.DescribeInstancesRequest import DescribeInstancesRequest
    from aliyunsdkecs.request.v20140526.StartInstanceRequest import StartInstanceRequest
    from aliyunsdkecs.request.v20140526.StopInstanceRequest import StopInstanceRequest

    try:
        from aliyunsdkcore.vendored.requests.packages.urllib3.util import ssl_

        ssl_.HAS_SNI = True
    except Exception:
        pass
except Exception:  # pragma: no cover - local dependency fallback
    AcsClient = None
    CommonRequest = None
    DescribeInstancesRequest = None
    StartInstanceRequest = None
    StopInstanceRequest = None


_original_getaddrinfo = socket.getaddrinfo


def _ipv4_only(host, port, family=0, type=0, proto=0, flags=0):
    results = _original_getaddrinfo(host, port, family, type, proto, flags)
    ipv4_results = [item for item in results if item[0] == socket.AF_INET]
    return ipv4_results or results


socket.getaddrinfo = _ipv4_only


@dataclass
class InstanceSnapshot:
    status: str
    traffic_gb: float | None
    bill_amount: float | None
    currency: str | None
    ip: str | None
    spec: str | None
    message: str = ""


class AliyunService:
    def __init__(self, account: CloudAccount):
        self.account = account

    def _client(self, region: str):
        if settings.mock_aliyun or AcsClient is None:
            return None
        return AcsClient(self.account.access_key_id, self.account.access_key_secret, region)

    def _do_common_request(self, client, request, retries: int = 3):
        if client is None or settings.mock_aliyun:
            return {}
        for attempt in range(1, retries + 1):
            try:
                response = client.do_action_with_exception(request)
                return json.loads(response.decode("utf-8"))
            except Exception:
                if attempt >= retries:
                    raise
                time.sleep(2 * attempt)
        return {}

    def get_instance_status(self, region: str, instance_id: str) -> dict[str, Any] | None:
        client = self._client(region)
        if client is None:
            return {"Status": "Running", "PublicIpAddress": {"IpAddress": ["127.0.0.1"]}, "Cpu": 2, "Memory": 2048}
        req = DescribeInstancesRequest()
        req.set_InstanceIds(json.dumps([instance_id]))
        data = self._do_common_request(client, req)
        instances = data.get("Instances", {}).get("Instance", [])
        return instances[0] if instances else None

    def get_cdt_traffic(self) -> float | None:
        client = self._client("cn-hangzhou")
        if client is None:
            return 36.4
        req = CommonRequest()
        req.set_domain("cdt.aliyuncs.com")
        req.set_version("2021-08-13")
        req.set_action_name("ListCdtInternetTraffic")
        req.set_method("POST")
        req.set_connect_timeout(5000)
        req.set_read_timeout(15000)
        data = self._do_common_request(client, req)
        total_bytes = sum(item.get("Traffic", 0) for item in data.get("TrafficDetails", []))
        return total_bytes / (1024**3)

    def get_bill_amount(self, policy: InstancePolicy) -> tuple[float | None, str | None]:
        client = self._client(policy.region)
        if client is None:
            return 0.88, self.account.currency
        current_cycle = time.strftime("%Y-%m")

        try:
            bill_req = CommonRequest()
            bill_req.set_domain("business.aliyuncs.com")
            bill_req.set_version("2017-12-14")
            bill_req.set_action_name("DescribeInstanceBill")
            bill_req.set_method("POST")
            bill_req.add_query_param("BillingCycle", current_cycle)
            bill_req.add_query_param("InstanceID", policy.instance_id)
            data = self._do_common_request(client, bill_req, retries=1)
            if data.get("Success"):
                items = data.get("Data", {}).get("Items", [])
                if items:
                    amount = sum(float(item.get("PretaxAmount", 0)) for item in items)
                    return amount, items[0].get("Currency", self.account.currency)
        except Exception:
            # Some international accounts reject DescribeInstanceBill on the CN billing endpoint.
            pass

        try:
            fallback_req = CommonRequest()
            fallback_req.set_domain(self.account.bill_endpoint)
            fallback_req.set_version("2017-12-14")
            fallback_req.set_action_name("QueryBillOverview")
            fallback_req.set_method("POST")
            fallback_req.add_query_param("BillingCycle", current_cycle)
            fallback = self._do_common_request(client, fallback_req)
            items = fallback.get("Data", {}).get("Items", {}).get("Item", [])
            if not items:
                return None, self.account.currency
            amount = sum(float(item.get("PretaxAmount", 0)) for item in items)
            return amount, items[0].get("Currency", self.account.currency)
        except Exception:
            return None, self.account.currency

    def inspect_instance(self, policy: InstancePolicy) -> InstanceSnapshot:
        detail = self.get_instance_status(policy.region, policy.instance_id)
        if detail is None:
            return InstanceSnapshot(
                status="Released",
                traffic_gb=self.get_cdt_traffic(),
                bill_amount=None,
                currency=self.account.currency,
                ip=None,
                spec=None,
                message="实例不存在或已被释放",
            )

        traffic_gb = self.get_cdt_traffic()
        bill_amount, currency = self.get_bill_amount(policy)
        public_ips = detail.get("PublicIpAddress", {}).get("IpAddress", [])
        eip = detail.get("EipAddress", {}).get("IpAddress", "")
        cpu = detail.get("Cpu", 0)
        memory_mb = detail.get("Memory", 0)
        memory_gb = f"{int(memory_mb / 1024)}" if memory_mb and memory_mb % 1024 == 0 else f"{memory_mb / 1024:.1f}"
        spec = f"{cpu}C{memory_gb}G" if cpu or memory_mb else None
        return InstanceSnapshot(
            status=detail.get("Status", "Unknown"),
            traffic_gb=traffic_gb,
            bill_amount=bill_amount,
            currency=currency or self.account.currency,
            ip=eip or (public_ips[0] if public_ips else None),
            spec=spec,
        )

    def start_instance(self, policy: InstancePolicy):
        client = self._client(policy.region)
        if client is None:
            return {"RequestId": "mock-start"}
        req = StartInstanceRequest()
        req.set_InstanceId(policy.instance_id)
        client.do_action_with_exception(req)
        return {"RequestId": "started"}

    def stop_instance(self, policy: InstancePolicy):
        client = self._client(policy.region)
        if client is None:
            return {"RequestId": "mock-stop"}
        req = StopInstanceRequest()
        req.set_InstanceId(policy.instance_id)
        client.do_action_with_exception(req)
        return {"RequestId": "stopped"}

    def recreate_instance(self, policy: InstancePolicy) -> str:
        if not policy.recreate_template_id:
            raise ValueError("缺少启动模板 ID，无法在释放后自动恢复")
        client = self._client(policy.region)
        if client is None:
            return f"mock-{policy.instance_id}"
        req = CommonRequest()
        req.set_domain("ecs.aliyuncs.com")
        req.set_version("2014-05-26")
        req.set_action_name("RunInstances")
        req.set_method("POST")
        req.add_query_param("RegionId", policy.region)
        req.add_query_param("LaunchTemplateId", policy.recreate_template_id)
        req.add_query_param("Amount", 1)
        data = self._do_common_request(client, req)
        instance_ids = data.get("InstanceIdSets", {}).get("InstanceIdSet", [])
        if not instance_ids:
            raise RuntimeError("阿里云未返回新实例 ID")
        return instance_ids[0]
