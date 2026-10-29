import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode as QrIcon, Smartphone, ExternalLink, UserCheck, ShieldCheck, Lock } from 'lucide-react';
import { ValidationShiftPayload } from '../types';
import {registerShift,shiftLink,RegisteredShift} from '../services/shifts';

interface AttendanceQrCodeProps {
  payload: ValidationShiftPayload;
  size?: number; // size in px, default 90
  density?: 'simple' | 'detailed';
  className?: string;
  showDetails?: boolean;
  mode?: 'tutor' | 'student';
  onOpenValidator?: (payload: ValidationShiftPayload) => void;
  onOpenStudentCheckIn?: (payload: ValidationShiftPayload) => void;
}

export const AttendanceQrCode: React.FC<AttendanceQrCodeProps> = ({
  payload,
  size = 90,
  density = 'simple',
  className = '',
  showDetails = true,
  mode = 'tutor',
  onOpenValidator,
  onOpenStudentCheckIn,
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const [registered,setRegistered]=useState<RegisteredShift|null>(null);
  const [generation,setGeneration]=useState(0);
  useEffect(()=>{const refresh=()=>setGeneration(n=>n+1);window.addEventListener('rm-config-changed',refresh);return()=>window.removeEventListener('rm-config-changed',refresh);},[]);
  useEffect(()=>{
    let live=true;setError(null);setDataUrl('');setRegistered(null);
    registerShift(payload).then(async shift=>{
      const image=await QRCode.toDataURL(shiftLink(shift,mode),{width:Math.max(size*2,220),margin:4,errorCorrectionLevel:'M',color:{dark:'#000000',light:'#ffffff'}});
      if(live){setRegistered(shift);setDataUrl(image);}
    }).catch(e=>{if(live)setError(e.message||'QR non disponibile');});
    return()=>{live=false;};
  },[JSON.stringify(payload),mode,size,generation]);
  const dailyPin=registered?.pin||'…';
  const securePayload=registered?{...registered.payload,shiftId:registered.shiftId,token:mode==='tutor'?registered.tutorToken:registered.studentToken,role:mode,serverPin:mode==='tutor'?registered.pin:undefined}:null;
  const isTutor = mode === 'tutor';

  return (
    <div
      data-qr-state={dataUrl?'ready':error?'error':'pending'}
      className={`w-[155px] min-h-[200px] flex flex-col items-center justify-between bg-white border border-stone-300 rounded-2xl p-2 shadow-2xs print:shadow-none print:border-stone-400 text-center ${className}`}
    >
      {/* Card Header */}
      <div className="w-full flex items-center justify-center gap-1 pb-1 text-[8.5px] font-black uppercase tracking-tight text-[#2C4437] print:text-black">
        {isTutor ? (
          <ShieldCheck className="w-3.5 h-3.5 text-[#2C4437] print:text-black shrink-0" />
        ) : (
          <UserCheck className="w-3.5 h-3.5 text-[#2C4437] print:text-black shrink-0" />
        )}
        <span className="whitespace-nowrap">
          {isTutor ? 'QR Appello Tutor' : 'QR Auto-Convalida Studente'}
        </span>
      </div>

      {/* QR Code Image Container */}
      <div
        style={{ width: `${size}px`, height: `${size}px` }}
        className="bg-white flex items-center justify-center overflow-hidden rounded-lg border border-stone-200 print:border-none my-1 shrink-0"
      >
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={isTutor ? 'QR Code Appello Tutor' : 'QR Code Auto-Convalida Studente'}
            style={{ width: `${size}px`, height: `${size}px` }}
            className="object-contain block"
          />
        ) : error ? (
          <span className="text-[9px] text-rose-500 text-center px-1">{error}</span>
        ) : (
          <div className="w-4 h-4 border-2 border-[#3E5C4B] border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* Subtitle & PIN Badge - Identical for both */}
      {showDetails && (
        <div className="w-full flex flex-col items-center justify-center space-y-1">
          <span className="h-7 flex items-center justify-center text-[8.5px] leading-tight text-stone-700 print:text-stone-900 font-semibold px-0.5">
            {isTutor
              ? 'Scansiona per appello rapido del docente/tutor'
              : 'Scansiona con fotocamera per registrare la tua presenza'}
          </span>
          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-[#2C4437] bg-stone-100 px-2 py-0.5 rounded border border-stone-300 print:border-stone-400">
            <Lock className="w-2.5 h-2.5" /> PIN: {dailyPin}
          </span>
        </div>
      )}

      {/* A real link remains clickable in browser-generated PDFs. */}
      <div className={`w-full mt-1.5 flex flex-col items-center justify-center ${isTutor ? '' : 'print:hidden'}`}>
        {isTutor ? (
          <a
            href={registered ? shiftLink(registered, 'tutor') : undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!registered}
            onClick={(event) => {
              if (!registered || !securePayload) {
                event.preventDefault();
                return;
              }
              // Keep the existing in-app opening. PDF readers use the href above.
              if (onOpenValidator) {
                event.preventDefault();
                onOpenValidator(securePayload);
              }
            }}
            className="w-full text-[9px] font-bold px-2 py-1 rounded-lg bg-[#E8EFEA] hover:bg-[#d5e4db] text-[#2C4437] border border-[#C5D6CC] transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-2xs print:shadow-none print:no-underline"
            title="Apri l’appello tutor di questo turno; collegamento disponibile anche nel PDF"
          >
            <ExternalLink className="w-2.5 h-2.5 text-[#3E5C4B]" />
            <span>Apri Appello Tutor</span>
          </a>
        ) : !isTutor && onOpenStudentCheckIn ? (
          <button
            type="button"
            disabled={!securePayload} onClick={() => securePayload && onOpenStudentCheckIn(securePayload)}
            className="w-full text-[9px] font-bold px-2 py-1 rounded-lg bg-[#E8EFEA] hover:bg-[#d5e4db] text-[#2C4437] border border-[#C5D6CC] transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
            title="Apri schermata auto-convalida studente su questo schermo"
          >
            <Smartphone className="w-2.5 h-2.5 text-[#3E5C4B]" />
            <span>Apri Check-in Studente</span>
          </button>
        ) : null}
      </div>
    </div>
  );
};
