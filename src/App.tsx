import { useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { RotateCcw } from 'lucide-react'
import './index.css'

type SplitResult = {
  from: number
  to: number
  splitTime: number
  velocity: number
  acceleration: number | null
  midpoint: number
}

function formatNumber(value: number, digits = 2) {
  if (!Number.isFinite(value)) return '—'
  return value.toFixed(digits)
}

export default function App() {
  const [athlete, setAthlete] = useState('')
  const [intervalDistance, setIntervalDistance] = useState<5 | 10>(10)
  const [totalDistance, setTotalDistance] = useState(50)
  const [isRunning, setIsRunning] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [checkpoints, setCheckpoints] = useState<number[]>([])

  const markerDistances = useMemo(() => {
    const markers: number[] = []
    for (let d = 0; d <= totalDistance; d += intervalDistance) {
      markers.push(d)
    }
    if (markers[markers.length - 1] !== totalDistance) {
      markers.push(totalDistance)
    }
    return markers
  }, [intervalDistance, totalDistance])

  const results = useMemo(() => {
    const splits: SplitResult[] = []

    for (let i = 1; i < checkpoints.length; i++) {
      const from = markerDistances[i - 1]
      const to = markerDistances[i]
      if (from == null || to == null) continue

      const splitTime = (checkpoints[i] - checkpoints[i - 1]) / 1000
      const distance = to - from
      if (splitTime <= 0 || distance <= 0) continue

      const velocity = distance / splitTime
      const priorVelocity = splits[splits.length - 1]?.velocity
      const priorTime = splits[splits.length - 1]?.splitTime
      const acceleration =
        priorVelocity != null && priorTime != null
          ? (velocity - priorVelocity) / ((priorTime + splitTime) / 2)
          : null

      splits.push({
        from,
        to,
        splitTime,
        velocity,
        acceleration,
        midpoint: (from + to) / 2,
      })
    }

    const peak = splits.reduce<SplitResult | null>((best, split) => {
      if (!best || split.velocity > best.velocity) return split
      return best
    }, null)

    const totalTime =
      checkpoints.length > 1
        ? (checkpoints[checkpoints.length - 1] - checkpoints[0]) / 1000
        : null

    const chartData = splits.map((split) => ({
      distance: split.midpoint,
      velocity: Number(split.velocity.toFixed(3)),
    }))

    return { splits, peak, totalTime, chartData }
  }, [checkpoints, markerDistances])

  const nextMarkerIndex = Math.min(checkpoints.length, markerDistances.length - 1)
  const nextDistance = markerDistances[nextMarkerIndex]
  const runComplete = checkpoints.length >= markerDistances.length

  const handleMainButton = () => {
    if (!isRunning) {
      setCheckpoints([0])
      setStartTime(performance.now())
      setIsRunning(true)
      return
    }

    if (startTime == null || runComplete) return

    const elapsed = performance.now() - startTime
    const nextCheckpoints = [...checkpoints, elapsed]
    setCheckpoints(nextCheckpoints)

    if (nextCheckpoints.length >= markerDistances.length) {
      setIsRunning(false)
    }
  }

  const stopRun = () => {
    setIsRunning(false)
  }

  const resetAll = () => {
    setAthlete('')
    setIntervalDistance(10)
    setTotalDistance(50)
    setIsRunning(false)
    setStartTime(null)
    setCheckpoints([])
  }

  return (
    <div className="app">
      <div className="container">
        <div className="header">
          <div>
            <h1>Sprint Velocity Web App</h1>
            <p>One button starts the run, and every tap after that marks the next cone crossing.</p>
          </div>
          <button className="secondary" onClick={resetAll}>Reset</button>
        </div>

        <div className="grid two-up">
          <div className="card">
            <h2>Session Setup</h2>

            <label>Athlete</label>
            <input
              value={athlete}
              onChange={(e) => setAthlete(e.target.value)}
              placeholder="Name or lane"
            />

            <label>Marker spacing</label>
            <div className="button-row">
              <button
                className={intervalDistance === 5 ? 'primary' : 'secondary'}
                onClick={() => setIntervalDistance(5)}
              >
                5 m
              </button>
              <button
                className={intervalDistance === 10 ? 'primary' : 'secondary'}
                onClick={() => setIntervalDistance(10)}
              >
                10 m
              </button>
            </div>

            <label>Total distance (m)</label>
            <input
              type="number"
              min={intervalDistance}
              step={intervalDistance}
              value={totalDistance}
              onChange={(e) =>
                setTotalDistance(Math.max(intervalDistance, Number(e.target.value) || intervalDistance))
              }
            />

            <div className="note">
              Built for student use on the track: one observer, one phone, one giant timing button.
            </div>
          </div>

          <div className="card">
            <h2>Live Timing</h2>

            <div className="button-row">
              <button className="secondary" onClick={resetAll}>
                <RotateCcw size={18} />
                Clear
              </button>
              <button className="secondary" onClick={stopRun} disabled={!isRunning}>
                Stop Run
              </button>
            </div>

            <button className="main-button" onClick={handleMainButton} disabled={runComplete}>
              {!isRunning && checkpoints.length === 0
                ? 'Start Run'
                : runComplete
                  ? 'Run Complete'
                  : `Tap at ${nextDistance} m`}
            </button>

            <div className="stats-row">
              <div className="mini-card">
                <div className="label">Captured markers</div>
                <div className="value">
                  {Math.max(0, checkpoints.length - 1)} / {markerDistances.length - 1}
                </div>
              </div>
              <div className="mini-card">
                <div className="label">Next marker</div>
                <div className="value">{runComplete ? 'Finished' : `${nextDistance} m`}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid three-up">
          <div className="card">
            <div className="label">Peak velocity</div>
            <div className="big-value">
              {results.peak ? `${formatNumber(results.peak.velocity)} m/s` : '—'}
            </div>
          </div>

          <div className="card">
            <div className="label">Peak window</div>
            <div className="big-value">
              {results.peak ? `${results.peak.from}-${results.peak.to} m` : '—'}
            </div>
          </div>

          <div className="card">
            <div className="label">Total time</div>
            <div className="big-value">
              {results.totalTime != null ? `${formatNumber(results.totalTime, 2)} s` : '—'}
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Velocity Graph {athlete ? `— ${athlete}` : ''}</h2>
          {results.chartData.length === 0 ? (
            <div className="note">Complete a few markers to see velocity versus distance.</div>
          ) : (
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={results.chartData} margin={{ top: 16, right: 20, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="distance"
                    type="number"
                    domain={[0, totalDistance]}
                    tickFormatter={(value) => `${value}m`}
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(value) =>  [`${formatNumber(Number(value), 2)} m/s`, 'Velocity']}
                    labelFormatter={(label) => `Midpoint: ${label} m`}
                  />
                  {results.peak ? <ReferenceLine x={results.peak.midpoint} label="Peak" /> : null}
                  <Line type="monotone" dataKey="velocity" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}