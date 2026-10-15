import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html lang="ko">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#f6f8fa" />
        <title>안전온 | 위험성평가 현황</title>
        <meta name="description" content="현장의 위험을 먼저 발견하고 함께 개선하는 위험성평가 플랫폼" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link href="/static/style.css" rel="stylesheet" />
        <script src="/static/app.js" defer></script>
      </head>
      <body>{children}</body>
    </html>
  )
})
