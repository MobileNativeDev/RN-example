import * as React from 'react';
import Svg, { Path, Rect, SvgProps } from 'react-native-svg';

const SpotifyBrandIcon = ({ width = 22, height = 22, ...props }: SvgProps) => {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 32 32"
      fill="none"
      {...props}
    >
      <Rect width={32} height={32} rx={8} fill="#1ED760" />
      <Path
        d="M9.6 10.7C13.15 9.55 17.3 9.92 20.42 11.56"
        stroke="white"
        strokeWidth={2.45}
        strokeLinecap="round"
      />
      <Path
        d="M10.2 14.85C12.68 14.03 15.62 14.25 17.82 15.42"
        stroke="white"
        strokeWidth={2.15}
        strokeLinecap="round"
      />
      <Path
        d="M10.95 18.82C12.7 18.27 14.7 18.43 16.16 19.22"
        stroke="white"
        strokeWidth={1.95}
        strokeLinecap="round"
      />
    </Svg>
  );
};

export default SpotifyBrandIcon;
