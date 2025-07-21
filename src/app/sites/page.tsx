"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/* ───────── 型 ───────── */
type Site = {
  id: string;
  siteName: string;
  ownerName: string;
  ownerPhone: string;
  homepageUrl?: string;

  cancelPending?: boolean; // 期末停止予約
  paymentStatus?: "active" | "pending_cancel" | "canceled" | "none"; // Stripe 状況
};

export default function SiteListPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [homepageInput, setHomepageInput] = useState("");
  const router = useRouter();

  /* ── Firestore + Stripe 状態を取得 ───────────────── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      /* Firestore 一覧 */
      const snap = await getDocs(collection(db, "siteSettings"));
      const rawList = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Site[];

      /* Stripe 状態を埋め込む */
      const listWithStatus: Site[] = await Promise.all(
        rawList.map(async (site) => {
          try {
            const res = await fetch(
              `/api/stripe/check-subscription?siteKey=${site.id}`
            );
            const { status } = (await res.json()) as {
              status: Site["paymentStatus"];
            };
            return { ...site, paymentStatus: status };
          } catch {
            return { ...site, paymentStatus: "none" };
          }
        })
      );

      setSites(listWithStatus);
    });

    return () => unsub();
  }, [router]);

  /* ── URL 保存 ─────────────────────────────── */
  const handleSave = async (siteId: string) => {
    await updateDoc(doc(db, "siteSettings", siteId), {
      homepageUrl: homepageInput,
      updatedAt: Timestamp.now(),
    });
    setSites((prev) =>
      prev.map((s) =>
        s.id === siteId ? { ...s, homepageUrl: homepageInput } : s
      )
    );
    setEditingId(null);
    setHomepageInput("");
  };

  /* ── 解約予約 ─────────────────────────── */
  const handleCancel = async (siteId: string) => {
    if (!confirm("本当に解約しますか？次回請求以降課金されません。")) return;

    const res = await fetch("/api/stripe/cancel-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteKey: siteId }),
    });

    if (!res.ok) return alert("解約に失敗しました");

    setSites((p) =>
      p.map((s) => (s.id === siteId ? { ...s, cancelPending: true } : s))
    );
  };

  /* ── 画面 ───────────────────────────────── */
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold mb-4">サイト一覧</h1>

      {sites.map((site) => {
        const isPending =
          site.cancelPending === true ||
          site.paymentStatus === "pending_cancel";
        const isCanceled = site.paymentStatus === "canceled";
        const isPaid = site.paymentStatus === "active";

        return (
          <Card key={site.id} className="p-4 shadow-md space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">{site.siteName}</span>

              {isPending && (
                <span className="px-2 py-0.5 text-xs rounded bg-yellow-500 text-white">
                  解約予定
                </span>
              )}
              {isCanceled && (
                <span className="px-2 py-0.5 text-xs rounded bg-gray-500 text-white">
                  解約済み
                </span>
              )}
            </div>

            <div>オーナー: {site.ownerName}</div>
            <div>電話番号: {site.ownerPhone}</div>

            {site.homepageUrl && (
              <div>
                <a
                  href={site.homepageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  ホームページを開く
                </a>
              </div>
            )}

            {/* URL 編集 or ボタン群 */}
            {editingId === site.id ? (
              <div className="space-y-2">
                <Input
                  type="url"
                  placeholder="https://..."
                  value={homepageInput}
                  onChange={(e) => setHomepageInput(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button onClick={() => handleSave(site.id)}>保存</Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingId(null);
                      setHomepageInput("");
                    }}
                  >
                    キャンセル
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingId(site.id);
                    setHomepageInput(site.homepageUrl ?? "");
                  }}
                >
                  {site.homepageUrl ? "✏️ URLを編集" : "＋ URLを追加"}
                </Button>

                {/* ★ 解約ボタン（課金中のみ） */}
                {isPaid && !isPending && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleCancel(site.id)}
                  >
                    解約する
                  </Button>
                )}
              </div>
            )}
          </Card>
        );
      })}

      {sites.length === 0 && <p>サイトが登録されていません。</p>}
    </div>
  );
}
