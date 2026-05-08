import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import Svg, {
  G,
  Path,
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import Clock from '../../../assets/svg/Clock.svg';
// import { AnimatedCircularProgress } from 'react-native-circular-progress';

const SIZE = 256;
const CANVAS = SIZE + 40;
const STROKE = 30;
const C = CANVAS / 2;
const R = (SIZE - STROKE) / 2;

function polarToCartesian(deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: C + R * Math.cos(rad), y: C + R * Math.sin(rad) };
}

function buildArcPath(startDeg: number, sweepDeg: number) {
  const sweep = sweepDeg >= 360 ? 359.99 : sweepDeg;
  const s = polarToCartesian(startDeg);
  const e = polarToCartesian(startDeg + sweep);
  return `M ${s.x} ${s.y} A ${R} ${R} 0 ${sweep > 180 ? 1 : 0} 1 ${e.x} ${e.y}`;
}

export const CircularProgress = React.memo(
  ({
    nextAlarm,
    timeLabel,
    dateLabel,
    progressLabel,
  }: {
    nextAlarm: Date;
    timeLabel: string;
    dateLabel: string;
    progressLabel?: string;
  }) => {
    const { formattedDiff, cap, arcPath } = useMemo(() => {
      const difference = nextAlarm.getTime() - Date.now();
      const now = new Date();
      const currentTimeInMin12h = (now.getHours() % 12) * 60 + now.getMinutes();
      const totalMinutes = difference > 0 ? Math.ceil(difference / 60000) : 0;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const formattedDiff =
        hours > 0 ? `In ${hours} hr ${minutes} min` : `${minutes} min`;
      const ROTATION = (currentTimeInMin12h * 0.5) % 360;
      const SWEEP = Math.min(360, Math.max(0, (totalMinutes % 720) * 0.5));
      const cap = polarToCartesian(ROTATION + SWEEP);
      const arcPath = SWEEP > 0 ? buildArcPath(ROTATION, SWEEP) : null;
      return { formattedDiff, ROTATION, SWEEP, cap, arcPath };
    }, [nextAlarm]);

    return (
      <View className="w-full items-center">
        <View style={{ padding: 4 }} className="relative">
          <Svg width={CANVAS} height={CANVAS}>
            <Defs>
              <SvgLinearGradient
                id="arcGrad"
                x1="0"
                y1={C}
                x2={SIZE}
                y2={C}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0" stopColor="#540743" />
                <Stop offset="1" stopColor="#B51D96" />
              </SvgLinearGradient>
            </Defs>

            {/* Gradient arc with white border */}
            {arcPath && (
              <>
                <Path
                  d={arcPath}
                  stroke="white"
                  strokeWidth={STROKE + 4}
                  strokeLinecap="round"
                  fill="none"
                />
                <Path
                  d={arcPath}
                  stroke="url(#arcGrad)"
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  fill="none"
                />
              </>
            )}

            {/* Cap circle at arc start */}
            <G transform={`translate(${cap.x - 11.5}, ${cap.y - 11.5})`}>
              <Circle
                cx={11.5}
                cy={11.5}
                r={11}
                fill="#FCE3FF"
                stroke="#CB30E0"
              />
              <G transform="translate(4, 4.5)">
                <Path
                  d="M7.49994 13.9264C6.65436 13.9264 5.86243 13.7659 5.12418 13.4448C4.38592 13.1237 3.74328 12.6896 3.19624 12.1426C2.6492 11.5955 2.21513 10.9529 1.89403 10.2146C1.57293 9.47639 1.41216 8.68424 1.41171 7.8382C1.41126 6.99216 1.57203 6.20024 1.89403 5.46244C2.21603 4.72463 2.64988 4.08198 3.19556 3.53449C3.74125 2.987 4.3839 2.55294 5.1235 2.23229C5.86311 1.91164 6.65526 1.75087 7.49994 1.74997C8.34463 1.74906 9.13678 1.90984 9.87638 2.23229C10.616 2.55474 11.2586 2.98881 11.8043 3.53449C12.35 4.08018 12.7841 4.72283 13.1065 5.46244C13.429 6.20204 13.5895 6.99396 13.5882 7.8382C13.5868 8.68244 13.4263 9.47458 13.1065 10.2146C12.7868 10.9547 12.3527 11.5973 11.8043 12.1426C11.2559 12.6878 10.6133 13.1219 9.87638 13.4448C9.13948 13.7677 8.34734 13.9282 7.49994 13.9264ZM9.39406 10.6794L10.3411 9.73232L8.17641 7.56761V4.45585H6.82347V8.10879L9.39406 10.6794ZM3.17053 0.633789L4.11759 1.58085L1.24259 4.45585L0.295532 3.50879L3.17053 0.633789ZM11.8294 0.633789L14.7044 3.50879L13.7573 4.45585L10.8823 1.58085L11.8294 0.633789ZM7.49994 12.5735C8.81906 12.5735 9.93817 12.1142 10.8573 11.1955C11.7764 10.2769 12.2357 9.15777 12.2352 7.8382C12.2348 6.51863 11.7755 5.39975 10.8573 4.48155C9.93907 3.56336 8.81996 3.10381 7.49994 3.10291C6.17992 3.102 5.06104 3.56155 4.1433 4.48155C3.22555 5.40155 2.766 6.52044 2.76465 7.8382C2.7633 9.15596 3.22285 10.2751 4.1433 11.1955C5.06375 12.116 6.18263 12.5753 7.49994 12.5735Z"
                  fill="#CB30E0"
                />
              </G>
            </G>
          </Svg>

          {/* Clock face centered over the ring */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            pointerEvents="none"
          >
            <Clock />
          </View>

          {/* Time / date / countdown labels */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            pointerEvents="none"
          >
            <Text
              allowFontScaling={false}
              className="text-[17px] font-semibold text-white text-center mb-1"
            >
              {timeLabel}
            </Text>
            <Text
              allowFontScaling={false}
              className="text-[17px] font-semibold text-white text-center mb-[10px]"
            >
              {dateLabel}
            </Text>
            <Text
              allowFontScaling={false}
              className="text-[15px] font-regular text-white text-center"
            >
              {progressLabel || formattedDiff}
            </Text>
          </View>
        </View>
      </View>
    );
  },
);

// export const CircularProgress = ({
//   nextAlarm,
//   timeLabel,
//   dateLabel,
//   progressLabel,
// }: {
//   nextAlarm: Date;
//   timeLabel: string;
//   dateLabel: string;
//   progressLabel?: string;
// }) => {
//   // Keep values in one place so renderCap can counter-rotate icon correctly
//   const difference = nextAlarm.getTime() - Date.now();

//   const now = new Date();
//   const currentTimeInMin12h = (now.getHours() % 12) * 60 + now.getMinutes();

//   const totalMinutes = Math.max(0, Math.round(difference / 60000));
//   const hours = Math.floor(totalMinutes / 60);
//   const minutes = totalMinutes % 60;
//   const formattedDiff =
//     hours > 0 ? `In ${hours} hr ${minutes} min` : `${minutes} min`;

//   // Normalize angles to stay within 0..360
//   const ROTATION = (currentTimeInMin12h * 0.5) % 360;
//   const deg = (totalMinutes % 720) * 0.5; // 0..360 based on 12h dial
//   const SWEEP = Math.min(360, Math.max(0, deg));

//   // Convert ms difference to hours and minutes

//   return (
//     <View className="w-full items-center">
//       <View className="p-1 relative ">
//         <AnimatedCircularProgress
//           size={256}
//           width={30}
//           fill={100}
//           tintColor="#B51D96"
//           backgroundColor="#FFFFFF"
//           backgroundWidth={32}
//           rotation={ROTATION}
//           arcSweepAngle={SWEEP}
//           lineCap="round"
//           renderCap={({ center }) => (
//             <G transform={`translate(${center.x - 11.5}, ${center.y - 11.5})`}>
//               <Circle
//                 cx={11.5}
//                 cy={11.5}
//                 r={11}
//                 fill="#FCE3FF"
//                 stroke="#CB30E0"
//               />
//               <G transform={`translate(4, 4.5) rotate(${-ROTATION}, 7.5, 7)`}>
//                 <Path
//                   d="M7.49994 13.9264C6.65436 13.9264 5.86243 13.7659 5.12418 13.4448C4.38592 13.1237 3.74328 12.6896 3.19624 12.1426C2.6492 11.5955 2.21513 10.9529 1.89403 10.2146C1.57293 9.47639 1.41216 8.68424 1.41171 7.8382C1.41126 6.99216 1.57203 6.20024 1.89403 5.46244C2.21603 4.72463 2.64988 4.08198 3.19556 3.53449C3.74125 2.987 4.3839 2.55294 5.1235 2.23229C5.86311 1.91164 6.65526 1.75087 7.49994 1.74997C8.34463 1.74906 9.13678 1.90984 9.87638 2.23229C10.616 2.55474 11.2586 2.98881 11.8043 3.53449C12.35 4.08018 12.7841 4.72283 13.1065 5.46244C13.429 6.20204 13.5895 6.99396 13.5882 7.8382C13.5868 8.68244 13.4263 9.47458 13.1065 10.2146C12.7868 10.9547 12.3527 11.5973 11.8043 12.1426C11.2559 12.6878 10.6133 13.1219 9.87638 13.4448C9.13948 13.7677 8.34734 13.9282 7.49994 13.9264ZM9.39406 10.6794L10.3411 9.73232L8.17641 7.56761V4.45585H6.82347V8.10879L9.39406 10.6794ZM3.17053 0.633789L4.11759 1.58085L1.24259 4.45585L0.295532 3.50879L3.17053 0.633789ZM11.8294 0.633789L14.7044 3.50879L13.7573 4.45585L10.8823 1.58085L11.8294 0.633789ZM7.49994 12.5735C8.81906 12.5735 9.93817 12.1142 10.8573 11.1955C11.7764 10.2769 12.2357 9.15777 12.2352 7.8382C12.2348 6.51863 11.7755 5.39975 10.8573 4.48155C9.93907 3.56336 8.81996 3.10381 7.49994 3.10291C6.17992 3.102 5.06104 3.56155 4.1433 4.48155C3.22555 5.40155 2.766 6.52044 2.76465 7.8382C2.7633 9.15596 3.22285 10.2751 4.1433 11.1955C5.06375 12.116 6.18263 12.5753 7.49994 12.5735Z"
//                   fill="#CB30E0"
//                 />
//               </G>
//             </G>
//           )}
//         >
//           {() => (
//             <View>
//               <Clock />
//             </View>
//           )}
//         </AnimatedCircularProgress>
//         <View className="absolute left-[83px] bottom-[100px] max-w-[107px] w-full">
//           <Text
//             allowFontScaling={false}
//             className="text-[17px] font-semibold text-white text-center mb-1"
//           >
//             {timeLabel}
//           </Text>
//           <Text
//             allowFontScaling={false}
//             className="text-[17px] font-semibold text-white text-center mb-[10px]"
//           >
//             {dateLabel}
//           </Text>
//           <Text
//             allowFontScaling={false}
//             className="text-[15px] font-regular text-white text-center"
//           >
//             {progressLabel || formattedDiff}
//           </Text>
//         </View>
//       </View>
//     </View>
//   );
// };
