import React from 'react';
import { Puzzle } from './wakeUpOptions/Puzzle';
import { Song } from './wakeUpOptions/Song';
import { Video } from './wakeUpOptions/Video';
import { Voice } from './wakeUpOptions/Voice';
import { WakeUpOption } from './types';

export const WakeUpOptionItem = React.memo(
  ({
    option,
    order,
    open,
    onRemove,
    onUpdate,
  }: {
    option: WakeUpOption;
    order: number;
    open: boolean;
    onRemove: (id: string) => void;
    onUpdate: (id: string, updates: any) => void;
  }) => {
    const commonProps = {
      order,
      onRemove: () => onRemove(option.id),
    };

    if (option.type === 'Puzzle') {
      return (
        <Puzzle
          {...commonProps}
          puzzleUri={option.puzzleUri || null}
          songName={option.songName || null}
          setPuzzleUri={uri => onUpdate(option.id, { puzzleUri: uri })}
          setSongName={name => onUpdate(option.id, { songName: name })}
          open={open}
        />
      );
    }

    if (option.type === 'Voice') {
      return (
        <Voice
          {...commonProps}
          voiceUri={option.voiceUri || null}
          voiceName={option.voiceName || null}
          setVoiceUri={uri => onUpdate(option.id, { voiceUri: uri })}
          setVoiceName={name => onUpdate(option.id, { voiceName: name })}
          open={open}
        />
      );
    }

    if (option.type === 'Video') {
      return (
        <Video
          {...commonProps}
          videoUri={option.videoUri || null}
          setVideoUri={uri => onUpdate(option.id, { videoUri: uri })}
          videoLink={option.videoLink || null}
          setVideoLink={link => onUpdate(option.id, { videoLink: link })}
          open={open}
        />
      );
    }

    if (option.type === 'Song') {
      return (
        <Song
          {...commonProps}
          songUri={option.songUri || null}
          songName={option.songName || null}
          setSongUri={uri => onUpdate(option.id, { songUri: uri })}
          setSongName={name => onUpdate(option.id, { songName: name })}
          open={open}
        />
      );
    }

    return null;
  },
);
