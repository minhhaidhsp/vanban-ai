import asyncio
import json
import time
from datetime import datetime
from unidecode import unidecode
import httpx
import argparse

BASE_URL = "http://localhost:8000"
EMAIL = "minhhaidhsp@gmail.com"  # đổi nếu khác
PASSWORD = ""  # truyền qua --password

# ═══════════════════════════════════════════
# 20 TEST CASES — sát dữ liệu thực tế
# ═══════════════════════════════════════════
TEST_CASES = [
    # NHÓM 1 — Chứng thực (5 câu) — dựa trên QĐ-UBND TP.HCM
    {
        "id": 1, "group": "chung_thuc",
        "query": "Danh mục thủ tục hành chính lĩnh vực chứng thực thuộc thẩm quyền UBND TP.HCM gồm những thủ tục nào?",
        "expected_keywords": ["chứng thực", "thủ tục", "UBND", "danh mục"],
        "expect_result": True
    },
    {
        "id": 2, "group": "chung_thuc",
        "query": "Các thủ tục hành chính chứng thực được sửa đổi bổ sung theo quyết định của UBND TP.HCM là gì?",
        "expected_keywords": ["sửa đổi", "bổ sung", "chứng thực"],
        "expect_result": True
    },
    {
        "id": 3, "group": "chung_thuc",
        "query": "Sở Tư pháp TP.HCM có thẩm quyền giải quyết những thủ tục chứng thực nào?",
        "expected_keywords": ["Sở Tư pháp", "chứng thực", "thẩm quyền"],
        "expect_result": True
    },
    {
        "id": 4, "group": "chung_thuc",
        "query": "Thủ tục hành chính về hòa giải ở cơ sở thuộc Sở Tư pháp TP.HCM gồm những bước nào?",
        "expected_keywords": ["hòa giải", "cơ sở", "Sở Tư pháp"],
        "expect_result": True
    },
    {
        "id": 5, "group": "chung_thuc",
        "query": "Danh mục 27 thủ tục hành chính lĩnh vực chứng thực tại TP.HCM bao gồm những thủ tục gì?",
        "expected_keywords": ["27", "chứng thực", "danh mục"],
        "expect_result": True
    },

    # NHÓM 2 — Hộ tịch / Tư pháp (5 câu)
    {
        "id": 6, "group": "ho_tich",
        "query": "Thủ tục đăng ký khai sinh tại UBND cấp xã cần những giấy tờ gì và thực hiện như thế nào?",
        "expected_keywords": ["khai sinh", "đăng ký", "thủ tục"],
        "expect_result": True
    },
    {
        "id": 7, "group": "ho_tich",
        "query": "Quy trình đăng ký khai tử và xóa đăng ký thường trú được thực hiện như thế nào?",
        "expected_keywords": ["khai tử", "thường trú", "xóa đăng ký"],
        "expect_result": True
    },
    {
        "id": 8, "group": "ho_tich",
        "query": "Thủ tục cấp thẻ bảo hiểm y tế cho trẻ em dưới 6 tuổi được liên thông với những thủ tục hành chính nào?",
        "expected_keywords": ["bảo hiểm y tế", "trẻ em", "6 tuổi", "liên thông"],
        "expect_result": True
    },
    {
        "id": 9, "group": "ho_tich",
        "query": "Bộ Tư pháp đã sửa đổi bổ sung những thủ tục hành chính nào theo Quyết định 845/QĐ-BTP?",
        "expected_keywords": ["Bộ Tư pháp", "sửa đổi", "845"],
        "expect_result": True
    },
    {
        "id": 10, "group": "ho_tich",
        "query": "Chính sách sửa đổi về đăng ký hộ tịch của Bộ Tư pháp có những nội dung thay đổi gì?",
        "expected_keywords": ["hộ tịch", "đăng ký", "chính sách"],
        "expect_result": True
    },

    # NHÓM 3 — Công nghệ chiến lược (5 câu)
    {
        "id": 11, "group": "cong_nghe",
        "query": "Kế hoạch phát triển công nghệ chiến lược của TP.HCM giao Sở KHCN thực hiện những nhiệm vụ gì?",
        "expected_keywords": ["công nghệ chiến lược", "Sở KHCN", "TP.HCM"],
        "expect_result": True
    },
    {
        "id": 12, "group": "cong_nghe",
        "query": "Danh mục công nghệ chiến lược ưu tiên của TP Hà Nội giai đoạn 2026-2030 gồm những lĩnh vực nào?",
        "expected_keywords": ["công nghệ chiến lược", "Hà Nội", "2026", "2030"],
        "expect_result": True
    },
    {
        "id": 13, "group": "cong_nghe",
        "query": "ĐHQG TP.HCM đề xuất những bài toán lớn nào trong lộ trình làm chủ công nghệ chiến lược?",
        "expected_keywords": ["ĐHQG", "bài toán", "công nghệ chiến lược"],
        "expect_result": True
    },
    {
        "id": 14, "group": "cong_nghe",
        "query": "Kế hoạch chuyển đổi số 2026 của Sở KH&CN TP.HCM có những nội dung báo cáo gì?",
        "expected_keywords": ["chuyển đổi số", "2026", "Sở KH&CN"],
        "expect_result": True
    },
    {
        "id": 15, "group": "cong_nghe",
        "query": "Chương trình KH&CN nâng cao tiềm lực của UBND TP.HCM được phê duyệt với mục tiêu gì?",
        "expected_keywords": ["KH&CN", "tiềm lực", "UBND TP.HCM", "phê duyệt"],
        "expect_result": True
    },

    # NHÓM 4 — Ngoài phạm vi kho (5 câu — kiểm tra từ chối đúng)
    {
        "id": 16, "group": "ngoai_pham_vi",
        "query": "Giá vàng SJC hôm nay là bao nhiêu?",
        "expected_keywords": [],
        "expect_result": False
    },
    {
        "id": 17, "group": "ngoai_pham_vi",
        "query": "Quy định về thuế thu nhập cá nhân năm 2025 như thế nào?",
        "expected_keywords": [],
        "expect_result": False
    },
    {
        "id": 18, "group": "ngoai_pham_vi",
        "query": "Điều kiện xét tuyển đại học năm 2026 là gì?",
        "expected_keywords": [],
        "expect_result": False
    },
    {
        "id": 19, "group": "ngoai_pham_vi",
        "query": "Thủ tục đăng ký kết hôn với người nước ngoài tại Việt Nam cần gì?",
        "expected_keywords": [],
        "expect_result": False
    },
    {
        "id": 20, "group": "ngoai_pham_vi",
        "query": "Lịch nghỉ lễ Tết Nguyên Đán 2026 của cán bộ công chức là mấy ngày?",
        "expected_keywords": [],
        "expect_result": False
    },
]

# ═══════════════════════════════════════════
# CORE FUNCTIONS
# ═══════════════════════════════════════════

async def get_token(client, email, password):
    r = await client.post(f"{BASE_URL}/api/v1/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"})
    if r.status_code != 200:
        raise Exception(f"Login failed: {r.text}")
    return r.json()["access_token"]

async def run_test(client, token, tc):
    start = time.time()
    result = {
        "id": tc["id"],
        "group": tc["group"],
        "query": tc["query"],
        "expect_result": tc["expect_result"],
        "has_result": False,
        "confidence": 0.0,
        "citation_rate": 0.0,
        "keyword_hit": False,
        "fallback_mode": False,
        "llm_available": False,
        "semantic_score": 0.0,
        "citation_score": 0.0,
        "latency_ms": 0,
        "error": None
    }
    try:
        r = await client.post(
            f"{BASE_URL}/api/v1/rag/query",
            json={"query": tc["query"], "top_k": 5, "min_score": 0.35, "stream": False},
            headers={"Authorization": f"Bearer {token}"},
            timeout=30.0
        )
        latency = int((time.time() - start) * 1000)
        result["latency_ms"] = latency

        if r.status_code == 200:
            data = r.json()
            result["has_result"] = bool(data.get("answer") and len(data.get("answer", "")) > 20)
            result["confidence"] = data.get("confidence", 0.0)
            result["fallback_mode"] = data.get("fallback_mode", False)
            result["llm_available"] = data.get("llm_available", False)

            # Citation rate từ citations list
            citations = data.get("citations", [])
            result["citation_rate"] = min(1.0, len(citations) / 3)

            # Semantic score và citation score riêng
            result["semantic_score"] = data.get("semantic_score", 0.0)
            result["citation_score"] = data.get("citation_score", 0.0)

            # Keyword hit dùng unidecode trên answer
            answer = data.get("answer", "")
            if tc["expected_keywords"] and answer:
                answer_norm = unidecode(answer.lower())
                hits = sum(1 for kw in tc["expected_keywords"]
                          if unidecode(kw.lower()) in answer_norm)
                result["keyword_hit"] = hits >= max(1, len(tc["expected_keywords"]) // 2)

            # Nhóm ngoài phạm vi: has_result = False nếu fallback_mode
            # hoặc answer chứa "không có thông tin" / "không tìm thấy"
            if not tc["expect_result"]:
                no_info_phrases = ["không có thông tin", "không tìm thấy",
                                   "ngoài phạm vi", "không có trong kho",
                                   "insufficient", "không đủ"]
                answer_lower = answer.lower()
                is_rejected = (
                    data.get("fallback_mode", False) or
                    not data.get("llm_available", False) or
                    any(p in answer_lower for p in no_info_phrases) or
                    len(answer) < 30
                )
                result["has_result"] = not is_rejected
        else:
            result["error"] = f"HTTP {r.status_code}"

    except Exception as e:
        result["error"] = str(e)
        result["latency_ms"] = int((time.time() - start) * 1000)

    return result

# ═══════════════════════════════════════════
# REPORT
# ═══════════════════════════════════════════

def generate_report(results):
    in_scope = [r for r in results if r["expect_result"]]
    out_scope = [r for r in results if not r["expect_result"]]

    avg_confidence = sum(r["confidence"] for r in in_scope) / len(in_scope) if in_scope else 0
    citation_rate = sum(1 for r in in_scope if r["citation_rate"] > 0) / len(in_scope) if in_scope else 0
    has_result_rate = sum(1 for r in in_scope if r["has_result"]) / len(in_scope) if in_scope else 0
    keyword_hit_rate = sum(1 for r in in_scope if r["keyword_hit"]) / len(in_scope) if in_scope else 0
    avg_latency = sum(r["latency_ms"] for r in results) / len(results)
    out_scope_correct = sum(1 for r in out_scope if not r["has_result"]) / len(out_scope) if out_scope else 0
    fallback_rate = sum(1 for r in in_scope if r["fallback_mode"]) / len(in_scope) if in_scope else 0

    # By group
    groups = {}
    for r in results:
        g = r["group"]
        if g not in groups:
            groups[g] = []
        groups[g].append(r)

    report = {
        "generated_at": datetime.now().isoformat(),
        "week": "w13_baseline",
        "summary": {
            "avg_confidence": round(avg_confidence, 3),
            "citation_rate": round(citation_rate, 3),
            "has_result_rate": round(has_result_rate, 3),
            "keyword_hit_rate": round(keyword_hit_rate, 3),
            "avg_latency_ms": round(avg_latency, 0),
            "out_of_scope_correct_rate": round(out_scope_correct, 3),
            "fallback_rate": round(fallback_rate, 3),
        },
        "by_group": {
            g: {
                "count": len(v),
                "avg_confidence": round(sum(r["confidence"] for r in v) / len(v), 3),
                "has_result_rate": round(sum(1 for r in v if r["has_result"]) / len(v), 3),
            }
            for g, v in groups.items()
        },
        "details": results
    }

    # In bảng markdown
    print("\n" + "="*70)
    print("BENCHMARK W13 — BASELINE REPORT")
    print("="*70)
    print(f"{'Metric':<35} {'Gia tri':>10}")
    print("-"*50)
    print(f"{'avg_confidence (in-scope)':<35} {avg_confidence:>10.3f}")
    print(f"{'citation_rate':<35} {citation_rate:>10.1%}")
    print(f"{'has_result_rate (in-scope)':<35} {has_result_rate:>10.1%}")
    print(f"{'keyword_hit_rate':<35} {keyword_hit_rate:>10.1%}")
    print(f"{'out_of_scope_correct_rate':<35} {out_scope_correct:>10.1%}")
    print(f"{'avg_latency_ms':<35} {avg_latency:>10.0f}ms")
    print(f"{'fallback_rate':<35} {fallback_rate:>10.1%}")
    print("\nTheo nhom:")
    for g, v in report["by_group"].items():
        print(f"  {g}: confidence={v['avg_confidence']:.3f}, has_result={v['has_result_rate']:.0%}")

    # Luu JSON
    with open("baseline_report_w13.json", "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(f"\nSaved: baseline_report_w13.json")

    return report

# ═══════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════

async def main(password, url=BASE_URL):
    global BASE_URL
    BASE_URL = url

    async with httpx.AsyncClient() as client:
        print("Dang login...")
        token = await get_token(client, EMAIL, password)
        print(f"Login OK\n")

        results = []
        for tc in TEST_CASES:
            result = await run_test(client, token, tc)
            status = "OK" if result["has_result"] == tc["expect_result"] else "FAIL"
            print(f"[{tc['id']:02d}] {status} {tc['query'][:55]:<55} conf={result['confidence']:.3f} {result['latency_ms']}ms")
            results.append(result)
            await asyncio.sleep(3)  # avoid rate limit

        generate_report(results)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--password", required=True)
    parser.add_argument("--url", default="http://localhost:8000")
    args = parser.parse_args()
    asyncio.run(main(args.password, args.url))
