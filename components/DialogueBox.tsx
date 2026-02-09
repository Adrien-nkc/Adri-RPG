import React, { useState, useEffect, useRef } from "react";
import { DialogueState } from "../types";
import { audioService } from "../services/audioService";

interface DialogueBoxProps {
  dialogue: DialogueState;
  onComplete: () => void;
}

const DialogueBox: React.FC<DialogueBoxProps> = ({ dialogue, onComplete }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const handleNextRef = useRef<() => void>(() => {});

  const fullText = dialogue.text[dialogue.currentIndex] || "";

  useEffect(() => {
    if (!dialogue.active) return;

    let currentText = "";
    let i = 0;
    setDisplayedText("");
    setIsTyping(true);

    if (timerRef.current) clearInterval(timerRef.current);

    // === TYPEWRITER SPEED: Change the 30 below to control how fast text appears (ms per character) ===
    timerRef.current = setInterval(() => {
      if (i < fullText.length) {
        currentText += fullText.charAt(i);
        setDisplayedText(currentText);
        // === DIALOGUE SOUND: Edit playTypingSound() in services/audioService.tsx to change the sound ===
        if (i % 2 === 0) audioService.playTypingSound();
        i++;
      } else {
        setIsTyping(false);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, 30);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [dialogue.currentIndex, dialogue.active, fullText]);

  const handleNext = () => {
    if (isTyping) {
      setDisplayedText(fullText);
      setIsTyping(false);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      onComplete();
    }
  };
  handleNextRef.current = handleNext;

  // Space/Enter behave exactly like click: complete current line or advance
  useEffect(() => {
    if (!dialogue.active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== " " && e.key !== "Enter") return;
      e.preventDefault();
      handleNextRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialogue.active]);

  if (!dialogue.active) return null;

  return (
    <div
      className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-3xl border-4 border-white bg-black p-6 cursor-pointer select-none z-50"
      onClick={handleNext}
    >
      <div className="flex items-start gap-6">
        <span className="text-white font-bold text-2xl shrink-0 mt-1">*</span>
        <div className="flex flex-col flex-1">
          {dialogue.speaker && (
            <span className="text-zinc-500 font-bold mb-1 uppercase tracking-widest text-sm">
              {dialogue.speaker}:
            </span>
          )}
          <p className="text-white text-xl leading-relaxed whitespace-pre-wrap break-words pl-1">
            {displayedText}
            {!isTyping && (
              <span className="inline-block w-2 h-6 bg-white ml-2 animate-pulse align-middle" />
            )}
          </p>
        </div>
      </div>
      <div className="absolute bottom-2 right-4 text-[10px] text-zinc-600 tracking-widest uppercase font-bold">
        [ SPACE / CLICK ]
      </div>
    </div>
  );
};

export default DialogueBox;
