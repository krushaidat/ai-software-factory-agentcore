
import { C } from '../../config/colors';

interface QuestionChipsProps {
  questions: string[];
  onSelect: (question: string) => void;
}

export function QuestionChips({ questions, onSelect }: QuestionChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {questions.map((q) => (
        <button
          key={q}
          onClick={() => onSelect(q)}
          style={{
            padding: '6px 12px',
            fontSize: 11,
            borderRadius: 16,
            background: C.surface,
            border: `1px solid ${C.border}`,
            color: C.muted,
            cursor: 'pointer',
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = C.accent;
            e.currentTarget.style.borderColor = C.accentBorder;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = C.muted;
            e.currentTarget.style.borderColor = C.border;
          }}
        >
          {q}
        </button>
      ))}
    </div>
  );
}
