import * as React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
  SvgProps,
} from 'react-native-svg';

const AppleMusicBrandIcon = ({
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
      <Defs>
        <LinearGradient id="appleMusicBg" x1="4" y1="4" x2="28" y2="28">
          <Stop offset="0" stopColor="#FF6B8E" />
          <Stop offset="1" stopColor="#FF415B" />
        </LinearGradient>
      </Defs>
      <Rect width={32} height={32} rx={8} fill="url(#appleMusicBg)" />
      <Path
        d="M22 7.4V18.2C22 20.18 20.38 21.74 18.42 21.74C16.5 21.74 15.1 20.62 15.1 19.02C15.1 17.42 16.5 16.3 18.42 16.3C19.16 16.3 19.8 16.48 20.35 16.84V11.48L12.94 13.26V21.18C12.94 23.16 11.34 24.72 9.38 24.72C7.46 24.72 6.06 23.6 6.06 22C6.06 20.4 7.46 19.28 9.38 19.28C10.12 19.28 10.76 19.46 11.31 19.82V10.68L22 7.4Z"
        fill="white"
      />
    </Svg>
  );
};

export default AppleMusicBrandIcon;
