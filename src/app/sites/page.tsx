"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Site = {
  id: string;
  siteName: string;
  ownerName: string;
  ownerPhone: string;
  homepageUrl?: string;
};

export default function SiteListPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [homepageInput, setHomepageInput] = useState("");
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      const snapshot = await getDocs(collection(db, "siteSettings"));
      const siteList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Site[];

      setSites(siteList);
    });

    return () => unsubscribe();
  }, [router]);

  const handleSave = async (siteId: string) => {
    const ref = doc(db, "siteSettings", siteId);
    await updateDoc(ref, {
      homepageUrl: homepageInput,
      updatedAt: new Date(),
    });

    // UI 更新
    setSites((prev) =>
      prev.map((s) =>
        s.id === siteId ? { ...s, homepageUrl: homepageInput } : s
      )
    );
    setEditingId(null);
    setHomepageInput("");
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold mb-4">サイト一覧</h1>

      {sites.map((site) => (
        <Card key={site.id} className="p-4 shadow-md space-y-2">
          <div className="font-bold text-lg">{site.siteName}</div>
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

          {/* 編集モード */}
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
            <Button
              size="sm"
              onClick={() => {
                setEditingId(site.id);
                setHomepageInput(site.homepageUrl ?? "");
              }}
            >
              {site.homepageUrl
                ? "✏️ ホームページURLを編集"
                : "＋ ホームページURLを追加"}
            </Button>
          )}
        </Card>
      ))}

      {sites.length === 0 && <p>サイトが登録されていません。</p>}
    </div>
  );
}
