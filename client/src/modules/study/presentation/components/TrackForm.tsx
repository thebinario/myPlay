import React, { useId, useState } from 'react';
import { Button } from '@/shared/ui/components/Button';
import type { SaveTrackCommand, StudyTrackKind } from '@/modules/study/domain/study';
import { CoursePicker } from './CoursePicker';
import { selectionPath, type CourseSelection } from './CoursePickerOptions';
import { TRACK_KIND_LABEL } from './study-format';
import { Chip, Field, fieldStyle, STUDY_THEME } from './study-ui';

interface TrackFormProps {
  busy?: boolean;
  onSubmit: (command: SaveTrackCommand) => Promise<boolean>;
}

/** Atalhos de preenchimento para plataformas comuns (o usuário pode digitar outra). */
const PLATFORM_PRESETS = [
  { name: 'Hack The Box', url: 'https://app.hackthebox.com' },
  { name: 'HackingClub', url: 'https://app.hackingclub.com' },
  { name: 'TryHackMe', url: 'https://tryhackme.com' },
  { name: 'PortSwigger Academy', url: 'https://portswigger.net/web-security' },
] as const;

const KINDS: StudyTrackKind[] = ['course', 'external', 'other'];

/** Nova trilha: curso da biblioteca, plataforma externa (labs/aulas) ou outro estudo. */
export const TrackForm: React.FC<TrackFormProps> = ({ busy = false, onSubmit }) => {
  const id = useId();
  const [kind, setKind] = useState<StudyTrackKind>('course');
  const [selection, setSelection] = useState<CourseSelection | null>(null);
  const selectionTitle =
    selection?.kind === 'library' ? selection.libraryName : (selection?.course.title ?? '');
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('');
  const [url, setUrl] = useState('');

  const effectiveTitle = title.trim() || (kind === 'course' ? selectionTitle : platform.trim());
  const ready =
    effectiveTitle !== '' &&
    (kind !== 'course' || selection !== null) &&
    (kind !== 'external' || platform.trim() !== '');

  const applyPreset = (preset: (typeof PLATFORM_PRESETS)[number]) => {
    setPlatform(preset.name);
    setUrl(preset.url);
  };

  const reset = () => {
    setSelection(null);
    setTitle('');
    setPlatform('');
    setUrl('');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const saved = await onSubmit({
      title: effectiveTitle,
      kind,
      courseId:
        kind === 'course' && selection?.kind === 'course' ? selection.course.courseId : null,
      sourceId: kind === 'course' && selection?.kind === 'library' ? selection.sourceId : null,
      platform: kind === 'course' ? null : platform.trim() || null,
      url: kind === 'course' ? null : url.trim() || null,
    });
    if (saved) reset();
  };

  return (
    <form
      aria-label="Nova trilha"
      onSubmit={submit}
      style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
    >
      <div
        role="group"
        aria-label="Tipo de trilha"
        style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}
      >
        {KINDS.map((value) => (
          <Chip
            key={value}
            label={TRACK_KIND_LABEL[value]}
            pressed={kind === value}
            onClick={() => setKind(value)}
          />
        ))}
      </div>

      {kind === 'course' && (
        <Field label="Curso" htmlFor={`${id}-course`}>
          <CoursePicker inputId={`${id}-course`} selection={selection} onSelect={setSelection} />
          <span style={{ fontSize: '12px', color: STUDY_THEME.muted }}>
            {selection ? selectionPath(selection) : 'Escolha um curso ou a biblioteca inteira'}
          </span>
        </Field>
      )}

      {kind === 'external' && (
        <>
          <div
            role="group"
            aria-label="Plataformas comuns"
            style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}
          >
            {PLATFORM_PRESETS.map((preset) => (
              <Chip
                key={preset.name}
                label={preset.name}
                pressed={platform === preset.name}
                color={STUDY_THEME.success}
                onClick={() => applyPreset(preset)}
              />
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="Plataforma" htmlFor={`${id}-platform`}>
              <input
                id={`${id}-platform`}
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                style={fieldStyle}
              />
            </Field>
            <Field label="Link" htmlFor={`${id}-url`}>
              <input
                id={`${id}-url`}
                value={url}
                placeholder="https://"
                onChange={(e) => setUrl(e.target.value)}
                style={fieldStyle}
              />
            </Field>
          </div>
        </>
      )}

      <Field label="Nome da trilha" htmlFor={`${id}-title`}>
        <input
          id={`${id}-title`}
          value={title}
          placeholder={effectiveTitle || 'Ex.: Hack The Box — Labs, Inglês técnico'}
          onChange={(e) => setTitle(e.target.value)}
          style={fieldStyle}
        />
      </Field>

      <div>
        <Button type="submit" disabled={busy || !ready}>
          Criar trilha
        </Button>
      </div>
    </form>
  );
};
