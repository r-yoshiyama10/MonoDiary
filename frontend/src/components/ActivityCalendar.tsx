import { useEffect, useState } from 'react'
import { api } from '../lib/api'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

function getColor(chars: number): string {
  if (chars === 0) return '#ebedf0'
  if (chars <= 200) return '#9be9a8'
  if (chars <= 500) return '#40c463'
  if (chars <= 1000) return '#30a14e'
  return '#216e39'
}

export function ActivityCalendar() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [heatmap, setHeatmap] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    api.getHeatmap(year, month).then((days) => {
      const map = new Map<string, number>()
      days.forEach((d) => map.set(d.date.slice(0, 10), d.total_chars))
      setHeatmap(map)
    })
  }, [year, month])

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay()

  const totalCells = 42
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ...Array(Math.max(0, totalCells - firstDayOfWeek - daysInMonth)).fill(null),
  ]

  const todayStr = today.toISOString().slice(0, 10)
  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth() + 1

  const prevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1)
      setMonth(12)
    } else {
      setMonth((m) => m - 1)
    }
  }

  const nextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1)
      setMonth(1)
    } else {
      setMonth((m) => m + 1)
    }
  }

  const isNextDisabled =
    year > today.getFullYear() ||
    (year === today.getFullYear() && month >= today.getMonth() + 1)

  const formatDate = (day: number) => {
    const mm = String(month).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    return `${year}-${mm}-${dd}`
  }



  return (
    <div
      style={{
        background: '#fffef9',
        border: '1px solid #e4dace',
        borderRadius: 16,
        padding: 16,
        boxShadow: '0 2px 12px rgba(80,60,20,0.07)',
      }}
    >
      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button
          onClick={prevMonth}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b6254', fontSize: 18, padding: '0 6px', lineHeight: 1 }}
        >
          ‹
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <select
            value={year}
            onChange={(e) => {
              const y = Number(e.target.value)
              setYear(y)
              if (y === today.getFullYear() && month > today.getMonth() + 1) {
                setMonth(today.getMonth() + 1)
              }
            }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: "'Noto Serif JP', serif", fontSize: 13, fontWeight: 600,
              color: '#3d2e1e', appearance: 'none', padding: '0 2px',
            }}
          >
            {Array.from({ length: 6 }, (_, i) => today.getFullYear() - 5 + i).map((y) => (
              <option key={y} value={y}>{y}年</option>
            ))}
          </select>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: "'Noto Serif JP', serif", fontSize: 13, fontWeight: 600,
              color: '#3d2e1e', appearance: 'none', padding: '0 2px',
            }}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
              const disabled = year === today.getFullYear() && m > today.getMonth() + 1
              return (
                <option key={m} value={m} disabled={disabled}>{m}月</option>
              )
            })}
          </select>
        </div>
        <button
          onClick={nextMonth}
          disabled={isNextDisabled}
          style={{
            background: 'none',
            border: 'none',
            cursor: isNextDisabled ? 'not-allowed' : 'pointer',
            color: isNextDisabled ? '#d0c4b0' : '#6b6254',
            fontSize: 18,
            padding: '0 6px',
            lineHeight: 1,
          }}
        >
          ›
        </button>
      </div>

      {/* 曜日ヘッダー */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 4 }}>
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            style={{ textAlign: 'center', fontSize: 9, color: '#a89a8c', fontFamily: "'Noto Sans JP', sans-serif" }}
          >
            {w}
          </div>
        ))}
      </div>

      {/* カレンダーグリッド */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} style={{ height: 44 }} />
          }
          const date = formatDate(day)
          const chars = heatmap.get(date) ?? 0
          const isToday = isCurrentMonth && date === todayStr
          return (
            <div
              key={date}
              style={{
                height: 44,
                borderRadius: 4,
                background: getColor(chars),
                cursor: 'default',
                outline: isToday ? '2px solid #c49a50' : 'none',
                outlineOffset: 1,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'flex-start',
                padding: '0 5px 4px',
              }}
            >
              <span style={{
                fontSize: 11,
                lineHeight: 1,
                fontFamily: "'Noto Sans JP', sans-serif",
                color: chars > 200 ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.35)',
                userSelect: 'none',
              }}>
                {day}
              </span>
            </div>
          )
        })}
      </div>


      {/* 凡例 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 6 }}>
        <span style={{ fontSize: 9, color: '#a89a8c' }}>少</span>
        {(['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'] as const).map((color) => (
          <div key={color} style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
        ))}
        <span style={{ fontSize: 9, color: '#a89a8c' }}>多</span>
      </div>
    </div>
  )
}
