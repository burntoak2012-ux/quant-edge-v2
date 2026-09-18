import Link from "next/link"

type BrandMarkProps = {
  href?: string
  compact?: boolean
}

export default function BrandMark({ href = "/", compact = false }: BrandMarkProps) {
  const mark = (
    <span aria-label="Quant Edge" className={`qe-brand ${compact ? "qe-brand-compact" : ""}`}>
      <span aria-hidden="true" className="qe-brand-symbol">
        <span className="qe-brand-core">Q</span>
        <span className="qe-brand-orbit" />
        <span className="qe-brand-signal" />
      </span>
      <span className="qe-brand-name">QUANT EDGE</span>
    </span>
  )

  return href ? <Link href={href}>{mark}</Link> : mark
}
