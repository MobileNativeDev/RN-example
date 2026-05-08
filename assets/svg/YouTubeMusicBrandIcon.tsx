import * as React from 'react';
import Svg, { Path, Rect, SvgProps } from 'react-native-svg';

const YouTubeMusicBrandIcon = ({
  width = 22,
  height = 22,
  ...props
}: SvgProps) => {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 32 32"
      fill="none"
      {...props}
    >
      <Rect width={32} height={32} rx={8} fill="#FF1A1A" />
      <Path
        d="M16 9.1C12.2 9.1 9.1 12.2 9.1 16C9.1 19.8 12.2 22.9 16 22.9C19.8 22.9 22.9 19.8 22.9 16C22.9 12.2 19.8 9.1 16 9.1Z"
        stroke="white"
        strokeWidth={2.15}
      />
      <Path d="M14.25 12.55L19.85 16L14.25 19.45V12.55Z" fill="white" />
    </Svg>
  );
};

export default YouTubeMusicBrandIcon;
