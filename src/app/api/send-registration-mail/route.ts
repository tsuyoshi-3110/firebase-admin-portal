import { NextResponse } from "next/server";
import { sendMail } from "@/lib/sendGmail";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  const subject = "【Pageit】アカウント登録が完了しました";
  const html = `
    <p>以下の内容でアカウントが作成されました。</p>
    <ul>
      <li><strong>メールアドレス:</strong> ${email}</li>
      <li><strong>パスワード:</strong> ${password}</li>
    </ul>
    <p>管理画面にログインしてご利用ください。</p>
  `;

  try {
    await sendMail(email, subject, html);
    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ status: "error", error });
  }
}
