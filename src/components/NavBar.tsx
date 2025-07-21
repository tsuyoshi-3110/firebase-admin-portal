// src/components/NavBar.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { User } from "firebase/auth";
import { useAtomValue } from "jotai";
import { openFlagAtom } from "@/lib/atoms/openFlagAtom";

export default function NavBar() {
  const [user, setUser] = useState<User | null>(null);
  const openFlag = useAtomValue(openFlagAtom);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  return (
    <nav className="fixed top-0 left-0 w-full h-16 bg-white shadow-md px-6 py-4 flex gap-6 items-center z-50">
      <Link
        href="/"
        className="text-lg font-bold text-gray-700 hover:text-blue-500"
      >
        Pageit管理サイト
      </Link>

      <div className="flex-1" />

      {openFlag && (
        <>
          <Link
            href="/login"
            className="text-sm text-gray-700 hover:text-blue-500"
          >
            ログイン
          </Link>

          {user && (
            <>
              <Link
                href="/register"
                className="text-sm text-gray-700 hover:text-blue-500 ml-4"
              >
                アカウント作成
              </Link>
              <Link
                href="/sites"
                className="text-sm text-gray-700 hover:text-blue-500 ml-4"
              >
                サイト一覧
              </Link>
            </>
          )}
        </>
      )}
    </nav>
  );
}
