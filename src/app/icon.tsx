import { ImageResponse } from 'next/og'
 
export const runtime = 'edge'
export const size = { width: 512, height: 512 }
export const contentType = 'image/png'
 
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#18181b', // zinc-900
          borderRadius: '128px',
        }}
      >
        <div
          style={{
            fontSize: 120,
            fontWeight: 900,
            letterSpacing: '-0.05em',
            fontFamily: 'system-ui, sans-serif',
            background: 'linear-gradient(to right, #34d399, #059669)', // emerald-400 to emerald-600
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          WERKIT
        </div>
      </div>
    ),
    { ...size }
  )
}
