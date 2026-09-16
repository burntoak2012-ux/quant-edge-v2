"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

type Language = "en" | "it"

type Messages = {
  signIn: string
  createAccount: string
  todayEdge: string
  matchIntelligence: string
  live: string
  focus: string
  fixtures: string
  welcome: string
  searchFixtures: string
  liveModelFeed: string
  browseLeagues: string
  viewAll: string
  standingsFixtures: string
  chooseDate: string
  showingFixtures: string
  loadingFixtures: string
  noFixtures: string
  checkBack: string
  noMatching: string
  tryDifferent: string
  homeRating: string
  awayRating: string
  lineupTotal: string
  pending: string
  confidence: string
  probabilitySplit: string
  odds: string
  unavailable: string
  marketContext: string
  openMatchBrief: string
  decisionSupport: string
  decisionSupportCopy: string
  language: string
  english: string
  italian: string
}

const messages: Record<Language, Messages> = {
  en: {
    signIn: "Sign in", createAccount: "Create account", todayEdge: "Today's edge", matchIntelligence: "Match intelligence", live: "Live", focus: "Focus", fixtures: "fixtures", welcome: "Welcome", searchFixtures: "Search fixtures", liveModelFeed: "Live model feed", browseLeagues: "Browse leagues", viewAll: "View all", standingsFixtures: "Standings & fixtures", chooseDate: "Choose a match date", showingFixtures: "Showing fixtures scheduled for", loadingFixtures: "Loading today's fixtures...", noFixtures: "No fixtures available today", checkBack: "Check back before kickoff when lineups and player ratings become available.", noMatching: "No matching fixtures", tryDifferent: "Try a different team name.", homeRating: "Home rating", awayRating: "Away rating", lineupTotal: "Lineup total", pending: "Pending", confidence: "Confidence", probabilitySplit: "Probability split", odds: "Odds", unavailable: "Unavailable", marketContext: "Market context", openMatchBrief: "Open match brief", decisionSupport: "Decision-support view", decisionSupportCopy: "Compare probabilities, ratings, lineups, odds, and context before making your own decision. Quant Edge is not a tipping service and does not guarantee outcomes.", language: "Language", english: "English", italian: "Italiano",
  },
  it: {
    signIn: "Accedi", createAccount: "Crea account", todayEdge: "Il vantaggio di oggi", matchIntelligence: "Analisi delle partite", live: "Live", focus: "Focus", fixtures: "partite", welcome: "Benvenuto", searchFixtures: "Cerca partite", liveModelFeed: "Dati del modello live", browseLeagues: "Esplora i campionati", viewAll: "Vedi tutto", standingsFixtures: "Classifica e calendario", chooseDate: "Scegli una data", showingFixtures: "Partite in programma per", loadingFixtures: "Caricamento delle partite...", noFixtures: "Nessuna partita disponibile oggi", checkBack: "Controlla prima del calcio d'inizio, quando saranno disponibili formazioni e valutazioni.", noMatching: "Nessuna partita trovata", tryDifferent: "Prova un altro nome di squadra.", homeRating: "Valutazione casa", awayRating: "Valutazione ospite", lineupTotal: "Totale formazione", pending: "In attesa", confidence: "Affidabilità", probabilitySplit: "Probabilità", odds: "Quote", unavailable: "Non disponibile", marketContext: "Contesto del mercato", openMatchBrief: "Apri analisi partita", decisionSupport: "Vista di supporto decisionale", decisionSupportCopy: "Confronta probabilità, valutazioni, formazioni, quote e contesto prima di decidere. Quant Edge non è un servizio di pronostici e non garantisce risultati.", language: "Lingua", english: "English", italian: "Italiano",
  },
}

type LanguageContextValue = {
  language: Language
  setLanguage: (language: Language) => void
  t: Messages
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === "undefined") return "en"
    const saved = window.localStorage.getItem("quant-edge-language")
    return saved === "it" || saved === "en" ? saved : "en"
  })

  function setLanguage(nextLanguage: Language) {
    setLanguageState(nextLanguage)
    window.localStorage.setItem("quant-edge-language", nextLanguage)
  }

  return <LanguageContext.Provider value={{ language, setLanguage, t: messages[language] }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider")
  return context
}

export function LanguageSelector() {
  const { language, setLanguage, t } = useLanguage()

  return (
    <label className="flex items-center gap-2 text-xs text-slate-400">
      <span className="sr-only">{t.language}</span>
      <select
        aria-label={t.language}
        className="rounded-full border border-cyan-200/20 bg-slate-900/80 px-3 py-2 text-xs text-slate-200 outline-none hover:border-cyan-200/50"
        onChange={(event) => setLanguage(event.target.value as "en" | "it")}
        value={language}
      >
        <option value="en">{t.english}</option>
        <option value="it">{t.italian}</option>
      </select>
    </label>
  )
}
