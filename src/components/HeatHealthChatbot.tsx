'use client'

import { useMemo, useState } from 'react'
import { Bot, ChevronDown, ExternalLink, MessageCircle, Send, ShieldAlert, X } from 'lucide-react'

type Message = { id: number; from: 'bot' | 'user'; text: string; urgent?: boolean }

type Answer = { text: string; urgent?: boolean }

const quickQuestions = [
  'What are signs of heat exhaustion?',
  'How can I stay hydrated?',
  'What should I do for heat stroke?',
  'Can I exercise in extreme heat?',
]

const knowledge = [
  {
    keys: ['heat stroke', 'heatstroke', 'stroke'],
    answer: {
      urgent: true,
      text: 'Heat stroke is a medical emergency. Warning signs can include confusion or altered mental status, loss of consciousness, seizures, and very high body temperature. Call your local emergency service immediately, move the person to a cool place, remove excess clothing, and cool them rapidly while help is coming. Do not delay emergency care.'
    }
  },
  {
    keys: ['heat exhaustion', 'exhaustion'],
    answer: {
      text: 'Heat exhaustion can cause heavy sweating, headache, nausea, dizziness, weakness, thirst and elevated body temperature. Move to a cool place, stop activity, loosen unnecessary clothing, and take frequent sips of cool water. If symptoms worsen, do not improve, or the person becomes confused or loses consciousness, seek urgent medical care.'
    }
  },
  {
    keys: ['hydration', 'hydrate', 'water', 'drink', 'thirst', 'dehydrated', 'dehydration'],
    answer: {
      text: 'On hot days, drink fluids regularly rather than waiting until you are very thirsty. Carry a bottle and refill it through the day. Light-yellow or clear urine generally suggests adequate hydration. Limit alcohol and be cautious with very sugary or highly caffeinated drinks. If a clinician has given you fluid restrictions, follow their advice instead.'
    }
  },
  {
    keys: ['exercise', 'workout', 'gym', 'running', 'sport', 'sports'],
    answer: {
      text: 'Heat increases the risk of dehydration and heat illness during exercise. Prefer cooler parts of the day, reduce intensity, take frequent breaks, drink more water than usual, and stop immediately if you feel faint or weak. Move to a cool place and recover. People with medical conditions or heat-sensitive medicines should discuss hot-weather exercise with their clinician.'
    }
  },
  {
    keys: ['symptom', 'dizzy', 'dizziness', 'headache', 'nausea', 'sweating', 'cramp', 'weakness', 'faint'],
    answer: {
      text: 'Common warning signs of heat-related illness include muscle cramps, unusually heavy sweating, dizziness, headache, weakness, nausea and shortness of breath. Stop exertion and move somewhere cooler. If there is confusion, loss of consciousness, seizures, or rapidly worsening symptoms, treat it as an emergency and seek immediate medical help.'
    }
  },
  {
    keys: ['cool', 'cooling', 'shade', 'fan', 'air conditioning', 'ac'],
    answer: {
      text: 'Get into shade or an air-conditioned/cool location, take regular breaks, and schedule outdoor activity for cooler parts of the day when possible. If indoor temperatures are above 90°F (32.2°C), CDC advises that a fan can increase body temperature rather than cool you.'
    }
  },
  {
    keys: ['elderly', 'older', 'child', 'children', 'pregnant', 'pregnancy', 'heart', 'asthma', 'chronic'],
    answer: {
      text: 'Some people need extra protection during heat, including older adults, infants and young children, pregnant people, people with heart disease or asthma, and people with other chronic conditions. Check on people who may be alone or especially vulnerable, and follow their clinician’s heat-action plan.'
    }
  },
  {
    keys: ['medicine', 'medication', 'medicines', 'drug', 'drugs'],
    answer: {
      text: 'Some medicines can increase dehydration or overheating risk, and heat can affect how some medicines are stored. Do not stop or change prescribed medicines on your own. Ask your clinician or pharmacist how your medicines should be managed during hot weather.'
    }
  },
]

function getAnswer(input: string): Answer {
  const q = input.toLowerCase().trim()
  if (!q) return { text: 'Tell me what you want to know about heat, hydration, symptoms, exercise, or staying safe.' }

  const emergencyWords = ['confused', 'unconscious', 'seizure', 'passed out', 'not responding', 'collapse']
  if (emergencyWords.some(word => q.includes(word))) {
    return {
      urgent: true,
      text: 'Those can be emergency warning signs of severe heat illness. Call your local emergency service now, move the person to a cool place, and start rapid cooling while help is coming. Do not leave them alone.'
    }
  }

  let best: Answer | null = null
  let bestScore = 0
  for (const item of knowledge) {
    const score = item.keys.reduce((sum, key) => sum + (q.includes(key) ? key.length : 0), 0)
    if (score > bestScore) {
      bestScore = score
      best = item.answer
    }
  }

  if (best) return best

  if (q.includes('who are you') || q.includes('what can you do') || q.includes('help')) {
    return { text: 'I’m HeatHealth Assistant. I can explain heat-illness warning signs, hydration, cooling, hot-weather exercise, risk groups, and when to seek urgent care. I provide general health information — I’m not a substitute for a clinician or emergency service.' }
  }

  return { text: 'I can help with heat exhaustion, heat stroke, hydration, cooling, exercise in hot weather, risk groups, and heat-related symptoms. Try asking “What are signs of heat exhaustion?” or “What should I do for heat stroke?”' }
}

export default function HeatHealthChatbot() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, from: 'bot', text: 'Hi — I’m your HeatHealth Assistant. Ask me about heat symptoms, hydration, cooling, or what to do in an emergency.' }
  ])

  const sourceLabel = useMemo(() => 'Evidence base: CDC heat-health guidance', [])

  function sendMessage(value = input) {
    const text = value.trim()
    if (!text) return
    const answer = getAnswer(text)
    const now = Date.now()
    setMessages(current => [
      ...current,
      { id: now, from: 'user', text },
      { id: now + 1, from: 'bot', text: answer.text, urgent: answer.urgent },
    ])
    setInput('')
  }

  return (
    <div className="fixed bottom-5 right-5 z-[1000] sm:bottom-6 sm:right-6">
      {open && (
        <div className="mb-3 flex h-[min(680px,calc(100vh-110px))] w-[min(390px,calc(100vw-32px))] flex-col overflow-hidden rounded-[28px] border border-[#dfe6dc] bg-[#f7f8f2] shadow-[0_24px_70px_rgba(7,39,31,.22)]">
          <div className="heat-gradient flex items-center justify-between px-5 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15"><Bot size={21} /></div>
              <div>
                <div className="font-bold">HeatHealth Assistant</div>
                <div className="text-[11px] text-white/75">Health information • not a diagnosis</div>
              </div>
            </div>
            <button aria-label="Close assistant" onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-white/10"><X size={19} /></button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map(message => (
              <div key={message.id} className={message.from === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className={message.from === 'user'
                  ? 'max-w-[84%] rounded-2xl rounded-br-md bg-[#0b3b2c] px-4 py-3 text-sm text-white'
                  : `max-w-[90%] rounded-2xl rounded-bl-md border px-4 py-3 text-sm leading-5 ${message.urgent ? 'border-red-200 bg-red-50 text-red-950' : 'border-[#dfe6dc] bg-white text-[#23352d]'}`}>
                  {message.urgent && <div className="mb-1 flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-[.12em] text-red-700"><ShieldAlert size={12} /> Urgent</div>}
                  {message.text}
                </div>
              </div>
            ))}

            {messages.length === 1 && (
              <div className="pt-1">
                <div className="mb-2 text-[10px] font-extrabold uppercase tracking-[.13em] text-slate-500">Try asking</div>
                <div className="grid gap-2">
                  {quickQuestions.map(question => (
                    <button key={question} onClick={() => sendMessage(question)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left text-xs font-semibold text-[#0b3b2c] transition hover:border-[#0b3b2c] hover:bg-[#eff8e6]">
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-[#dfe6dc] bg-white p-3">
            <div className="mb-2 flex items-center justify-between gap-2 px-1 text-[10px] text-slate-500">
              <span>{sourceLabel}</span>
              <a href="https://www.cdc.gov/heat-health/about/index.html" target="_blank" rel="noreferrer" className="flex items-center gap-1 font-semibold hover:text-[#0b3b2c]">Source <ExternalLink size={10} /></a>
            </div>
            <form onSubmit={event => { event.preventDefault(); sendMessage() }} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-[#f7f8f2] p-1.5 focus-within:border-[#0b3b2c]">
              <input value={input} onChange={event => setInput(event.target.value)} placeholder="Ask about heat health…" className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none" aria-label="Ask HeatHealth Assistant" />
              <button type="submit" aria-label="Send message" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0b3b2c] text-white hover:bg-[#07271f]"><Send size={17} /></button>
            </form>
          </div>
        </div>
      )}

      <button onClick={() => setOpen(current => !current)} aria-label={open ? 'Close HeatHealth Assistant' : 'Open HeatHealth Assistant'} className="group ml-auto flex items-center gap-2 rounded-full bg-[#0b3b2c] px-4 py-3 text-white shadow-[0_12px_35px_rgba(7,39,31,.24)] transition hover:-translate-y-0.5 hover:bg-[#07271f]">
        {open ? <ChevronDown size={19} /> : <MessageCircle size={20} />}
        <span className="hidden text-sm font-bold sm:inline">HeatHealth Assistant</span>
      </button>
    </div>
  )
}
