import React, { forwardRef } from 'react';

interface ShareCardProps {
  photoA: string;
  photoB: string;
  scoreA: number;
  scoreB: number;
  winner: string;
  verdict: string;
  mode?: string;
}

const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  ({ photoA, photoB, scoreA, scoreB, winner, verdict, mode }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '1080px',
          height: '1080px',
          backgroundColor: '#000000',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Inter, sans-serif',
          overflow: 'hidden',
        }}
      >
        {/* Photos side by side — top 65% */}
        <div style={{ display: 'flex', flex: '0 0 65%', position: 'relative' }}>
          {/* Photo A */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <img
              src={photoA}
              crossOrigin="anonymous"
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
            />
            <div style={{
              position: 'absolute', inset: 0,
              background: winner === 'B' ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.05)'
            }} />
            {/* Score bubble */}
            <div style={{
              position: 'absolute', bottom: 24, left: 24,
              background: winner === 'A' ? '#ffffff' : 'rgba(0,0,0,0.6)',
              borderRadius: 16, padding: '12px 20px',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}>
              <span style={{
                fontSize: 48, fontWeight: 900, lineHeight: 1,
                color: winner === 'A' ? '#000' : '#ffffff'
              }}>{scoreA}</span>
              {winner === 'A' && (
                <span style={{ fontSize: 18, fontWeight: 700, color: '#000', marginTop: 2 }}>👑 WINNER</span>
              )}
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: 4, background: '#000', flexShrink: 0 }} />

          {/* Photo B */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <img
              src={photoB}
              crossOrigin="anonymous"
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
            />
            <div style={{
              position: 'absolute', inset: 0,
              background: winner === 'A' ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.05)'
            }} />
            <div style={{
              position: 'absolute', bottom: 24, left: 24,
              background: winner === 'B' ? '#ffffff' : 'rgba(0,0,0,0.6)',
              borderRadius: 16, padding: '12px 20px',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}>
              <span style={{
                fontSize: 48, fontWeight: 900, lineHeight: 1,
                color: winner === 'B' ? '#000' : '#ffffff'
              }}>{scoreB}</span>
              {winner === 'B' && (
                <span style={{ fontSize: 18, fontWeight: 700, color: '#000', marginTop: 2 }}>👑 WINNER</span>
              )}
            </div>
          </div>

          {/* VS badge center */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#000', border: '4px solid #333',
            borderRadius: '50%', width: 72, height: 72,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10,
          }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 22 }}>VS</span>
          </div>
        </div>

        {/* Bottom panel — verdict + branding */}
        <div style={{
          flex: 1, background: '#000',
          padding: '32px 48px',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          {/* Verdict text */}
          <p style={{
            color: '#ffffff', fontSize: 28, fontWeight: 600,
            lineHeight: 1.45, margin: 0,
            display: '-webkit-box', WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            "{verdict}"
          </p>

          {/* Branding row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, background: '#7c3aed',
                borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: '#fff', fontWeight: 900, fontSize: 20 }}>V</span>
              </div>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 28, letterSpacing: '-0.5px' }}>VRSUS</span>
            </div>
            <span style={{ color: '#555', fontSize: 22, fontWeight: 500 }}>
              {mode ? mode.toUpperCase() : 'DUEL'} MODE
            </span>
          </div>
        </div>
      </div>
    );
  }
);

ShareCard.displayName = 'ShareCard';
export default ShareCard;
