type LineupAlertEmail = {
  to: string
  fixtureId: number
  homeTeam: string
  awayTeam: string
  homeTotal: number
  awayTotal: number
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] || character)
}

export function lineupEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.LINEUP_ALERT_FROM)
}

export async function sendLineupAlertEmail(alert: LineupAlertEmail) {
  if (!lineupEmailConfigured()) throw new Error("Lineup email delivery is not configured")

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://quantedgefootball.com"
  const homeTeam = escapeHtml(alert.homeTeam)
  const awayTeam = escapeHtml(alert.awayTeam)
  const strongerTeam = alert.homeTotal === alert.awayTotal
    ? "The confirmed XIs are level on rating total."
    : `${escapeHtml(alert.homeTotal > alert.awayTotal ? alert.homeTeam : alert.awayTeam)} has the stronger confirmed XI.`

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.LINEUP_ALERT_FROM,
      to: [alert.to],
      subject: `Confirmed XI: ${alert.homeTeam} vs ${alert.awayTeam}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#172033">
          <p style="font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#087f8c">Quant Edge lineup alert</p>
          <h1 style="font-size:26px">${homeTeam} vs ${awayTeam}</h1>
          <p>Both starting lineups are now confirmed.</p>
          <table style="width:100%;border-collapse:collapse;margin:24px 0">
            <tr><td style="padding:12px;border:1px solid #d9e2e7">${homeTeam}</td><td style="padding:12px;border:1px solid #d9e2e7;text-align:right;font-weight:bold">${alert.homeTotal}</td></tr>
            <tr><td style="padding:12px;border:1px solid #d9e2e7">${awayTeam}</td><td style="padding:12px;border:1px solid #d9e2e7;text-align:right;font-weight:bold">${alert.awayTotal}</td></tr>
          </table>
          <p>${strongerTeam}</p>
          <p><a href="${appUrl}/fixtures/${alert.fixtureId}" style="color:#087f8c;font-weight:bold">Open the full match brief</a></p>
          <p style="font-size:12px;color:#667085">Ratings are informational estimates, not betting advice or guarantees.</p>
        </div>
      `,
    }),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Resend rejected lineup alert: ${response.status} ${message}`)
  }
}