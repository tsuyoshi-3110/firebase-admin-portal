// 修正された RegisterPage コンポーネント
"use client";

import { useEffect, useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { createSiteSettings } from "../lib/createSiteSettings";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FirebaseError } from "firebase/app";
import { getDoc, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [siteKey, setSiteKey] = useState("");
  const [siteName, setSiteName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerAddress, setOwnerAddress] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [homepageUrl, setHomepageUrl] = useState("");

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleRegister = async () => {
    setLoading(true);
    try {
      // ✅ Firestore にドキュメントが既にあるかチェック
      const ref = doc(db, "siteSettings", siteKey);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const confirmOverwrite = window.confirm(
          "この siteKey はすでに使われています。上書きしてもよろしいですか？"
        );
        if (!confirmOverwrite) {
          alert("登録をキャンセルしました。");
          return;
        }
      }

      // ✅ このタイミングでアカウント作成
      const userCred = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // ✅ Firestore 登録
      await createSiteSettings(siteKey, {
        ownerId: userCred.user.uid,
        siteName,
        siteKey,
        ownerName,
        ownerAddress,
        ownerEmail: email,
        ownerPhone,
        homepageUrl,
      });

      // ✅ メール通知など
      await fetch("/api/send-registration-mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      alert("登録完了しました");
      // 初期化
      setEmail("");
      setPassword("");
      setSiteKey("");
      setSiteName("");
      setOwnerName("");
      setOwnerAddress("");
      setOwnerPhone("");
    } catch (e) {
      if (e instanceof FirebaseError) {
        if (e.code === "auth/email-already-in-use") {
          alert(
            "このメールアドレスはすでに登録されています。別のアドレスをお使いください。"
          );
        } else {
          alert("登録時にエラーが発生しました: " + e.message);
        }
      } else {
        alert("不明なエラーが発生しました。");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
     <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] gap-6 p-8">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>アカウント登録</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="パスワード（6文字以上）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              onClick={() => {
                const generated = Math.random().toString(36).slice(-10);
                setPassword(generated);
              }}
            >
              自動生成
            </Button>
          </div>
          <Input
            type="text"
            placeholder="sityKey（英数字）"
            value={siteKey}
            onChange={(e) => setSiteKey(e.target.value)}
          />
          <Input
            type="text"
            placeholder="サイト名"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
          />
          <Input
            type="text"
            placeholder="名前（オーナー）"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
          />
          <Input
            type="text"
            placeholder="住所"
            value={ownerAddress}
            onChange={(e) => setOwnerAddress(e.target.value)}
          />
          <Input
            type="tel"
            placeholder="電話番号"
            value={ownerPhone}
            onChange={(e) => setOwnerPhone(e.target.value)}
          />
          <Input
            type="url"
            placeholder="ホームページURL（任意）"
            value={homepageUrl}
            onChange={(e) => setHomepageUrl(e.target.value)}
          />
          <Button
            onClick={handleRegister}
            disabled={loading}
            className="w-full"
          >
            {loading ? "登録中..." : "登録する"}
          </Button>

        </CardContent>
      </Card>
    </div>
  );
}
