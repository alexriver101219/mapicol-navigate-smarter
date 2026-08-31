import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type RecognitionCtor = new () => SpeechRecognitionLike;

function getRecognition(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function VoiceInput({
  onTranscript,
  label = "Hablar",
  size = "default",
}: {
  onTranscript: (text: string) => void;
  label?: string;
  size?: "default" | "lg" | "icon";
}) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setSupported(getRecognition() !== null);
    return () => recognitionRef.current?.stop();
  }, []);

  const toggle = useCallback(() => {
    const Ctor = getRecognition();
    if (!Ctor) {
      toast.error("Tu navegador no soporta comandos por voz.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new Ctor();
    recognition.lang = "es-CO";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript) onTranscript(transcript.trim());
    };
    recognition.onerror = (event) => {
      setListening(false);
      if (event.error === "not-allowed") {
        toast.error("Permite el acceso al micrófono para usar los comandos por voz.");
      }
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [listening, onTranscript]);

  return (
    <Button
      type="button"
      variant={listening ? "destructive" : "secondary"}
      size={size}
      onClick={toggle}
      disabled={!supported}
      aria-label={listening ? "Detener dictado" : "Iniciar dictado por voz"}
      className={listening ? "listening-pulse gap-2" : "gap-2"}
    >
      {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
      {size !== "icon" && <span>{listening ? "Escuchando…" : label}</span>}
    </Button>
  );
}
