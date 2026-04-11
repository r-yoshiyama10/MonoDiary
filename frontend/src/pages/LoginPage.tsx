import type { ReactNode } from 'react'

export function LoginPage() {
  const handleLogin = () => {
    window.location.href = '/auth/line'
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f7f4ef] px-4 py-12">
      <div className="w-full max-w-md space-y-6">

        {/* ヘッダー */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-stone-900">
            MonoDiary
          </h1>
          <p className="mt-2 text-base text-stone-500">
            LINE で送った言葉が、日記になる。
          </p>
        </div>

        {/* 使い方カード */}
        <div className="rounded-2xl bg-white p-8 shadow-[0_2px_20px_rgba(120,100,80,0.1)] ring-1 ring-stone-200">
          <h2 className="mb-5 text-center text-sm font-semibold uppercase tracking-widest text-stone-400">
            はじめかた
          </h2>

          <ol className="mb-7 space-y-4">
            <Step number={1} title="LINE を友だち追加">
              下の QR コードから MonoDiary を友だち追加します
            </Step>
            <Step number={2} title="日記を LINE に送る">
              その日の出来事や気持ちをトークで送るだけ
            </Step>
            <Step number={3} title="ここで振り返る">
              ログインして、日記をまとめて読み返せます
            </Step>
          </ol>

          {/* QRコード */}
          <div className="flex flex-col items-center gap-3">
            <img
              src="https://qr-official.line.me/gs/M_532aamdn_BW.png?oat_content=qr"
              alt="MonoDiary LINE QR コード"
              className="h-36 w-36 rounded-xl ring-1 ring-stone-200"
            />
            <a
              href="https://lin.ee/Z2U3RJb"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl bg-[#06C755] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#05b34c] active:scale-95"
            >
              <LineIcon />
              友だち追加
            </a>
          </div>
        </div>

        {/* ログインカード */}
        <div className="rounded-2xl bg-white p-6 shadow-[0_2px_20px_rgba(120,100,80,0.1)] ring-1 ring-stone-200">
          <p className="mb-4 text-center text-sm text-stone-500">
            すでに友だち追加済みの方はこちら
          </p>
          <button
            onClick={handleLogin}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#06C755] px-4 py-3 font-semibold text-white transition hover:bg-[#05b34c] active:scale-95"
          >
            <LineIcon />
            LINE でログイン
          </button>
        </div>

      </div>
    </div>
  )
}

function Step({
  number,
  title,
  children,
}: {
  number: number
  title: string
  children: ReactNode
}) {
  return (
    <li className="flex items-start gap-4">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#06C755] text-xs font-bold text-white">
        {number}
      </span>
      <div>
        <p className="font-semibold text-stone-800">{title}</p>
        <p className="mt-0.5 text-sm text-stone-500">{children}</p>
      </div>
    </li>
  )
}

function LineIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-5 w-5"
    >
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  )
}
