import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  PanResponder,
  View,
  useWindowDimensions,
} from 'react-native';
import SoundPlayer from 'react-native-sound-player';

const GRID_SIZE = 3;
const PIECE_COUNT = GRID_SIZE * GRID_SIZE;
const BOARD_HORIZONTAL_PADDING = 32;
const GRID_COLOR = 'rgba(132, 59, 117, 1)';
const PIECE_LIFT_SPRING = {
  friction: 14,
  tension: 48,
};

type PuzzleSoundUri =
  | string
  | number
  | null
  | Array<string | number | null>;

type PuzzleMedia = {
  imageUri: string | number | null;
  soundUri: PuzzleSoundUri;
} | null;

type Point = {
  x: number;
  y: number;
};

type Cell = {
  row: number;
  col: number;
};

type Cluster = {
  id: string;
  slotIndices: number[];
  pieceIds: number[];
  localCells: Cell[];
  anchor: Cell;
};

type ClusterShape = Omit<Cluster, 'id'>;

type PieceEdgeMask = {
  bottom: boolean;
  left: boolean;
  right: boolean;
  top: boolean;
};

type PieceClusterMeta = {
  cluster: Cluster;
  edgeMask: PieceEdgeMask;
};

type PieceAnimationState = {
  scale: Animated.Value;
  translate: Animated.ValueXY;
};

type ActiveDragState = {
  cluster: Cluster;
  pieceIds: number[];
  startAnchorPosition: Point;
  startPositions: Point[];
};

type PieceTileProps = {
  boardHeight: number;
  boardWidth: number;
  edgeMask: PieceEdgeMask;
  imageSource: { uri: string };
  isDragging: boolean;
  onDragCancel: (pieceId: number) => void;
  onDragEnd: (
    pieceId: number,
    gestureState: { dx: number; dy: number },
  ) => void;
  onDragMove: (
    pieceId: number,
    gestureState: { dx: number; dy: number },
  ) => void;
  onDragStart: (pieceId: number) => void;
  pieceId: number;
  scale: Animated.Value;
  slotHeight: number;
  slotWidth: number;
  translate: Animated.ValueXY;
  zIndex: number;
};

const PIECE_IDS = Array.from({ length: PIECE_COUNT }, (_, index) => index);

const shufflePieces = () => {
  const next = PIECE_IDS.slice();

  do {
    for (let index = next.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      const current = next[index];
      next[index] = next[swapIndex];
      next[swapIndex] = current;
    }
  } while (next.every((pieceId, index) => pieceId === index));

  return next;
};

const getRowCol = (index: number): Cell => ({
  row: Math.floor(index / GRID_SIZE),
  col: index % GRID_SIZE,
});

const getIndexFromRowCol = (row: number, col: number) => row * GRID_SIZE + col;

const getPieceCorrectCell = (pieceId: number): Cell => ({
  row: Math.floor(pieceId / GRID_SIZE),
  col: pieceId % GRID_SIZE,
});

const areSlotsAdjacent = (left: number, right: number) => {
  const a = getRowCol(left);
  const b = getRowCol(right);
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
};

const arePiecesCorrectlyAligned = (
  leftPieceId: number,
  rightPieceId: number,
  leftSlot: number,
  rightSlot: number,
) => {
  const leftPieceCell = getPieceCorrectCell(leftPieceId);
  const rightPieceCell = getPieceCorrectCell(rightPieceId);
  const leftSlotCell = getRowCol(leftSlot);
  const rightSlotCell = getRowCol(rightSlot);

  return (
    rightPieceCell.row - leftPieceCell.row ===
      rightSlotCell.row - leftSlotCell.row &&
    rightPieceCell.col - leftPieceCell.col ===
      rightSlotCell.col - leftSlotCell.col
  );
};

const buildClusterShapes = (boardPieces: number[]): ClusterShape[] => {
  const visited = new Set<number>();
  const clusters: ClusterShape[] = [];

  PIECE_IDS.forEach(startSlot => {
    if (visited.has(startSlot)) {
      return;
    }

    const queue = [startSlot];
    const slotIndices: number[] = [];
    visited.add(startSlot);

    while (queue.length > 0) {
      const slot = queue.shift() as number;
      slotIndices.push(slot);

      PIECE_IDS.forEach(candidateSlot => {
        if (visited.has(candidateSlot) || !areSlotsAdjacent(slot, candidateSlot)) {
          return;
        }

        const slotPieceId = boardPieces[slot];
        const candidatePieceId = boardPieces[candidateSlot];

        if (
          arePiecesCorrectlyAligned(
            slotPieceId,
            candidatePieceId,
            slot,
            candidateSlot,
          )
        ) {
          visited.add(candidateSlot);
          queue.push(candidateSlot);
        }
      });
    }

    slotIndices.sort((a, b) => a - b);

    const slotCells = slotIndices.map(getRowCol);
    const minRow = Math.min(...slotCells.map(cell => cell.row));
    const minCol = Math.min(...slotCells.map(cell => cell.col));
    const localCells = slotCells.map(cell => ({
      row: cell.row - minRow,
      col: cell.col - minCol,
    }));

    clusters.push({
      slotIndices,
      pieceIds: slotIndices.map(slotIndex => boardPieces[slotIndex]),
      localCells,
      anchor: { row: minRow, col: minCol },
    });
  });

  return clusters;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, max));

const getCellKey = ({ row, col }: Cell) => `${row}:${col}`;

const getDynamicMoveTiming = (
  from: Point,
  to: Point,
  clusterSize: number,
) => {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const baseDuration = 280;
  const distanceBonus = Math.min(220, distance * 0.5);
  const clusterBonus = Math.min(180, Math.max(0, clusterSize - 1) * 36);
  const duration = Math.round(
    clamp(baseDuration + distanceBonus + clusterBonus, 280, 760),
  );
  const delay =
    clusterSize > 1
      ? Math.round(
          clamp(12 + Math.min(28, distance * 0.04) + (clusterSize - 1) * 10, 12, 80),
        )
      : 0;

  return {
    delay,
    duration,
    easing:
      clusterSize > 1
        ? Easing.bezier(0.16, 0.92, 0.2, 1)
        : Easing.bezier(0.14, 0.9, 0.22, 1),
  };
};

const getNextBoardPiecesAfterDrop = (
  boardPieces: number[],
  cluster: Cluster,
  droppedPosition: Point,
  slotWidth: number,
  slotHeight: number,
) => {
  const maxLocalRow = Math.max(...cluster.localCells.map(cell => cell.row));
  const maxLocalCol = Math.max(...cluster.localCells.map(cell => cell.col));
  const targetAnchorCol = clamp(
    Math.round(droppedPosition.x / slotWidth),
    0,
    GRID_SIZE - 1 - maxLocalCol,
  );
  const targetAnchorRow = clamp(
    Math.round(droppedPosition.y / slotHeight),
    0,
    GRID_SIZE - 1 - maxLocalRow,
  );

  const sourceSlots = cluster.localCells.map(cell =>
    getIndexFromRowCol(cluster.anchor.row + cell.row, cluster.anchor.col + cell.col),
  );
  const targetSlots = cluster.localCells.map(cell =>
    getIndexFromRowCol(targetAnchorRow + cell.row, targetAnchorCol + cell.col),
  );

  const isSamePlacement = sourceSlots.every(
    (slotIndex, index) => slotIndex === targetSlots[index],
  );

  if (isSamePlacement) {
    return boardPieces;
  }

  const nextBoardPieces = boardPieces.slice();
  const sourcePieces = sourceSlots.map(slotIndex => boardPieces[slotIndex]);
  const sourceSet = new Set(sourceSlots);
  const targetSet = new Set(targetSlots);
  const sourceOnlySlots = sourceSlots.filter(slotIndex => !targetSet.has(slotIndex));
  const deltaRow = targetAnchorRow - cluster.anchor.row;
  const deltaCol = targetAnchorCol - cluster.anchor.col;

  targetSlots.forEach((slotIndex, index) => {
    nextBoardPieces[slotIndex] = sourcePieces[index];
  });

  sourceOnlySlots.forEach(sourceSlot => {
    let searchRow = getRowCol(sourceSlot).row;
    let searchCol = getRowCol(sourceSlot).col;
    let displacedSlot = sourceSlot;

    while (true) {
      searchRow += deltaRow;
      searchCol += deltaCol;
      displacedSlot = getIndexFromRowCol(searchRow, searchCol);

      if (!sourceSet.has(displacedSlot)) {
        break;
      }
    }

    nextBoardPieces[sourceSlot] = boardPieces[displacedSlot];
  });

  return nextBoardPieces;
};

const PieceTile = memo(
  ({
    boardHeight,
    boardWidth,
    edgeMask,
    imageSource,
    isDragging,
    onDragCancel,
    onDragEnd,
    onDragMove,
    onDragStart,
    pieceId,
    scale,
    slotHeight,
    slotWidth,
    translate,
    zIndex,
  }: PieceTileProps) => {
    const correctCell = useMemo(() => getPieceCorrectCell(pieceId), [pieceId]);
    const panResponder = useMemo(
      () =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: (_, gestureState) =>
            Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2,
          onPanResponderGrant: () => onDragStart(pieceId),
          onPanResponderMove: (_, gestureState) => {
            onDragMove(pieceId, gestureState);
          },
          onPanResponderRelease: (_, gestureState) => {
            onDragEnd(pieceId, gestureState);
          },
          onPanResponderTerminate: () => onDragCancel(pieceId),
          onPanResponderTerminationRequest: () => false,
        }),
      [onDragCancel, onDragEnd, onDragMove, onDragStart, pieceId],
    );

    return (
      <Animated.View
        {...panResponder.panHandlers}
        style={{
          position: 'absolute',
          width: slotWidth,
          height: slotHeight,
          zIndex,
          transform: [
            { translateX: translate.x },
            { translateY: translate.y },
            { scale },
          ],
          shadowColor: '#000',
          shadowOpacity: isDragging ? 0.32 : 0.12,
          shadowRadius: isDragging ? 10 : 4,
          shadowOffset: {
            width: 0,
            height: isDragging ? 8 : 3,
          },
          elevation: isDragging ? 10 : 2,
        }}
      >
        <View
          style={{
            width: slotWidth,
            height: slotHeight,
            overflow: 'hidden',
            borderTopWidth: edgeMask.top ? 1 : 0,
            borderRightWidth: edgeMask.right ? 1 : 0,
            borderBottomWidth: edgeMask.bottom ? 1 : 0,
            borderLeftWidth: edgeMask.left ? 1 : 0,
            borderColor: 'rgba(255,255,255,0.12)',
            backgroundColor: 'rgba(255,255,255,0.03)',
          }}
        >
          <Image
            source={imageSource}
            style={{
              position: 'absolute',
              width: boardWidth,
              height: boardHeight,
              left: -correctCell.col * slotWidth,
              top: -correctCell.row * slotHeight,
            }}
            resizeMode="cover"
            fadeDuration={0}
          />
        </View>
      </Animated.View>
    );
  },
  (prevProps, nextProps) =>
    prevProps.boardHeight === nextProps.boardHeight &&
    prevProps.boardWidth === nextProps.boardWidth &&
    prevProps.edgeMask.top === nextProps.edgeMask.top &&
    prevProps.edgeMask.right === nextProps.edgeMask.right &&
    prevProps.edgeMask.bottom === nextProps.edgeMask.bottom &&
    prevProps.edgeMask.left === nextProps.edgeMask.left &&
    prevProps.imageSource.uri === nextProps.imageSource.uri &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.pieceId === nextProps.pieceId &&
    prevProps.scale === nextProps.scale &&
    prevProps.slotHeight === nextProps.slotHeight &&
    prevProps.slotWidth === nextProps.slotWidth &&
    prevProps.translate === nextProps.translate &&
    prevProps.zIndex === nextProps.zIndex,
);

export const PuzzleActivity = memo(
  ({
    puzzleUri,
    onComplete,
    autoPlay = true,
    completed = false,
    widthSlide,
    horizontalPadding = BOARD_HORIZONTAL_PADDING,
    mediaHeight,
  }: {
    puzzleUri: PuzzleMedia;
    onComplete?: () => void;
    autoPlay?: boolean;
    completed?: boolean;
    widthSlide?: number;
    horizontalPadding?: number;
    mediaHeight?: number;
  }) => {
    const { width } = useWindowDimensions();
    const [boardPieces, setBoardPieces] = useState<number[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [completedLocal, setCompletedLocal] = useState(completed);
    const [imageAspectRatio, setImageAspectRatio] = useState(1);
    const [imageReady, setImageReady] = useState(false);
    const [activeClusterId, setActiveClusterId] = useState<string | null>(null);
    const finishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const didNotifyCompleteRef = useRef(completed);
    const clusterIdCounterRef = useRef(0);
    const previousClustersRef = useRef<Cluster[]>([]);
    const boardPiecesRef = useRef<number[]>([]);
    const shouldSnapPiecesRef = useRef(true);
    const activeDragRef = useRef<ActiveDragState | null>(null);
    const pieceSlotMapRef = useRef<number[]>(PIECE_IDS.map(() => -1));
    const pieceClusterMetaRef = useRef<Array<PieceClusterMeta | null>>(
      PIECE_IDS.map(() => null),
    );
    const pieceCurrentPositionsRef = useRef<Point[]>(
      PIECE_IDS.map(() => ({ x: 0, y: 0 })),
    );
    const pieceAnimationsRef = useRef<PieceAnimationState[]>(
      PIECE_IDS.map(() => ({
        scale: new Animated.Value(1),
        translate: new Animated.ValueXY({ x: 0, y: 0 }),
      })),
    );

    const baseBoardWidth = Math.max(
      0,
      Math.floor((widthSlide ?? width) - horizontalPadding),
    );
    const boardWidth = baseBoardWidth;
    const boardHeight =
      typeof mediaHeight === 'number' && mediaHeight > 0
        ? Math.floor(mediaHeight)
        : Math.max(1, Math.floor(boardWidth / imageAspectRatio));
    const slotWidth = Math.floor(boardWidth / GRID_SIZE);
    const slotHeight = Math.floor(boardHeight / GRID_SIZE);
    const normalizedBoardWidth = slotWidth * GRID_SIZE;
    const normalizedBoardHeight = slotHeight * GRID_SIZE;

    const soundUris = useMemo(() => {
      const soundUri = puzzleUri?.soundUri;
      const rawUris = Array.isArray(soundUri) ? soundUri : [soundUri];

      return rawUris.filter(
        (uri): uri is string | number =>
          typeof uri === 'string' || typeof uri === 'number',
      );
    }, [puzzleUri?.soundUri]);

    const imageSource = useMemo(() => {
      const imageUri = puzzleUri?.imageUri;

      if (typeof imageUri === 'number') {
        return { uri: Image.resolveAssetSource(imageUri).uri };
      }

      if (typeof imageUri === 'string' && imageUri.length > 0) {
        return { uri: imageUri };
      }

      return null;
    }, [puzzleUri?.imageUri]);

    useEffect(() => {
      const imageUri = puzzleUri?.imageUri;
      setImageReady(false);
      const fallbackTimer = setTimeout(() => {
        setImageReady(true);
      }, 1500);

      const markReady = () => {
        clearTimeout(fallbackTimer);
        setImageReady(true);
      };

      if (typeof imageUri === 'number') {
        const asset = Image.resolveAssetSource(imageUri);
        if (asset.width && asset.height) {
          setImageAspectRatio(asset.width / asset.height);
        }
        markReady();
        return () => {
          clearTimeout(fallbackTimer);
        };
      }

      if (!imageUri) {
        setImageAspectRatio(1);
        markReady();
        return () => {
          clearTimeout(fallbackTimer);
        };
      }

      if (typeof imageUri === 'string' && imageUri.length > 0) {
        let disposed = false;
        const safeMarkReady = () => {
          if (!disposed) {
            markReady();
          }
        };

        const safeSetAspectRatio = (nextRatio: number) => {
          if (!disposed) {
            setImageAspectRatio(nextRatio);
          }
        };

        Image.getSize(
          imageUri,
          (imageWidth, imageHeight) => {
            if (imageWidth > 0 && imageHeight > 0) {
              safeSetAspectRatio(imageWidth / imageHeight);
            }
            safeMarkReady();
          },
          () => {
            safeSetAspectRatio(1);
            safeMarkReady();
          },
        );
        Image.prefetch(imageUri)
          .catch(() => {})
          .finally(safeMarkReady);

        return () => {
          disposed = true;
          clearTimeout(fallbackTimer);
        };
      }

      setImageAspectRatio(1);
      markReady();
      return () => {
        clearTimeout(fallbackTimer);
      };
    }, [puzzleUri?.imageUri]);

    useEffect(() => {
      if (normalizedBoardWidth <= 0 || normalizedBoardHeight <= 0) {
        return;
      }

      activeDragRef.current = null;
      setActiveClusterId(null);
      shouldSnapPiecesRef.current = true;
      PIECE_IDS.forEach(pieceId => {
        pieceAnimationsRef.current[pieceId].scale.stopAnimation();
        pieceAnimationsRef.current[pieceId].scale.setValue(1);
      });
      setCompletedLocal(completed);
      didNotifyCompleteRef.current = completed;
      setBoardPieces(completed ? PIECE_IDS.slice() : shufflePieces());
    }, [completed, normalizedBoardHeight, normalizedBoardWidth, puzzleUri?.imageUri]);

    const clusters = useMemo(() => {
      if (boardPieces.length !== PIECE_COUNT) {
        previousClustersRef.current = [];
        return [];
      }

      const shapes = buildClusterShapes(boardPieces);
      const usedPreviousIds = new Set<string>();

      const nextClusters = shapes.map(shape => {
        const exactMatch = previousClustersRef.current.find(previousCluster => {
          if (usedPreviousIds.has(previousCluster.id)) {
            return false;
          }

          return (
            previousCluster.pieceIds.length === shape.pieceIds.length &&
            previousCluster.pieceIds.every(
              (pieceId, index) => pieceId === shape.pieceIds[index],
            )
          );
        });

        if (exactMatch) {
          usedPreviousIds.add(exactMatch.id);
          return {
            id: exactMatch.id,
            ...shape,
          };
        }

        const overlapMatch = previousClustersRef.current
          .filter(previousCluster => !usedPreviousIds.has(previousCluster.id))
          .map(previousCluster => ({
            cluster: previousCluster,
            overlap: previousCluster.pieceIds.filter(pieceId =>
              shape.pieceIds.includes(pieceId),
            ).length,
          }))
          .filter(match => match.overlap > 0)
          .sort((left, right) => right.overlap - left.overlap)[0];

        if (overlapMatch) {
          usedPreviousIds.add(overlapMatch.cluster.id);
          return {
            id: overlapMatch.cluster.id,
            ...shape,
          };
        }

        const nextId = `cluster-runtime-${clusterIdCounterRef.current++}`;
        return {
          id: nextId,
          ...shape,
        };
      });

      previousClustersRef.current = nextClusters;
      return nextClusters;
    }, [boardPieces]);

    const pieceSlotMap = useMemo(() => {
      const nextMap = PIECE_IDS.map(() => -1);
      boardPieces.forEach((pieceId, slotIndex) => {
        nextMap[pieceId] = slotIndex;
      });
      return nextMap;
    }, [boardPieces]);

    const pieceClusterMeta = useMemo(() => {
      const nextMeta: Array<PieceClusterMeta | null> = PIECE_IDS.map(() => null);

      clusters.forEach(cluster => {
        const occupiedCells = new Set(cluster.localCells.map(getCellKey));

        cluster.pieceIds.forEach((pieceId, index) => {
          const localCell = cluster.localCells[index];
          nextMeta[pieceId] = {
            cluster,
            edgeMask: {
              top: !occupiedCells.has(
                getCellKey({ row: localCell.row - 1, col: localCell.col }),
              ),
              right: !occupiedCells.has(
                getCellKey({ row: localCell.row, col: localCell.col + 1 }),
              ),
              bottom: !occupiedCells.has(
                getCellKey({ row: localCell.row + 1, col: localCell.col }),
              ),
              left: !occupiedCells.has(
                getCellKey({ row: localCell.row, col: localCell.col - 1 }),
              ),
            },
          };
        });
      });

      return nextMeta;
    }, [clusters]);

    const renderLoading = useCallback(() => <ActivityIndicator />, []);

    const playAt = useCallback(
      async (index: number) => {
        if (soundUris.length === 0) {
          return;
        }

        const nextIndex = Math.max(0, Math.min(index, soundUris.length - 1));
        const uriToPlay = soundUris[nextIndex];

        try {
          if (typeof uriToPlay === 'number') {
            const resolved = Image.resolveAssetSource(uriToPlay);
            const filename = resolved.uri.split('/').pop()?.split('?')[0] || '';
            const nameWithoutExt = filename.replace(/\.mp3$|\.wav$|\.m4a$/i, '');

            await SoundPlayer.playSoundFile(nameWithoutExt, 'mp3');
          } else {
            await SoundPlayer.playUrl(uriToPlay);
          }

          setIsPlaying(true);
        } catch (error) {
          console.warn('PuzzleActivity sound playback failed', error);
          setIsPlaying(false);
        }
      },
      [soundUris],
    );

    useEffect(() => {
      if (
        soundUris.length === 0 ||
        !autoPlay ||
        isPlaying ||
        completed ||
        completedLocal
      ) {
        return;
      }

      playAt(0);
    }, [autoPlay, completed, completedLocal, isPlaying, playAt, soundUris.length]);

    useEffect(() => {
      const handleFinished = () => {
        if (finishTimeoutRef.current) {
          clearTimeout(finishTimeoutRef.current);
        }

        finishTimeoutRef.current = setTimeout(() => {
          setIsPlaying(false);
        }, 100);
      };

      try {
        (SoundPlayer as any).addEventListener?.(
          'FinishedPlaying',
          handleFinished,
        );
      } catch {}

      return () => {
        if (finishTimeoutRef.current) {
          clearTimeout(finishTimeoutRef.current);
          finishTimeoutRef.current = null;
        }

        try {
          (SoundPlayer as any).removeEventListener?.(
            'FinishedPlaying',
            handleFinished,
          );
        } catch {}

        setIsPlaying(false);
      };
    }, []);

    useEffect(() => {
      const solved =
        boardPieces.length === PIECE_COUNT &&
        boardPieces.every((pieceId, slotIndex) => pieceId === slotIndex);

      if (!solved || didNotifyCompleteRef.current) {
        return;
      }

      didNotifyCompleteRef.current = true;
      setCompletedLocal(true);

      try {
        onComplete?.();
      } catch {}
    }, [boardPieces, onComplete]);

    useEffect(() => {
      return () => {
        if (finishTimeoutRef.current) {
          clearTimeout(finishTimeoutRef.current);
        }

        try {
          SoundPlayer.stop();
        } catch {}

        setIsPlaying(false);
      };
    }, []);

    useEffect(() => {
      boardPiecesRef.current = boardPieces;
    }, [boardPieces]);

    useEffect(() => {
      pieceSlotMapRef.current = pieceSlotMap;
    }, [pieceSlotMap]);

    useEffect(() => {
      pieceClusterMetaRef.current = pieceClusterMeta;
    }, [pieceClusterMeta]);

    useEffect(() => {
      const listenerIds = PIECE_IDS.map(pieceId =>
        pieceAnimationsRef.current[pieceId].translate.addListener(value => {
          pieceCurrentPositionsRef.current[pieceId] = value;
        }),
      );

      return () => {
        PIECE_IDS.forEach(pieceId => {
          pieceAnimationsRef.current[pieceId].translate.removeListener(
            listenerIds[pieceId],
          );
        });
      };
    }, []);

    const animatePieceToPosition = useCallback(
      (
        pieceId: number,
        target: Point,
        options?: {
          clusterSize?: number;
          immediate?: boolean;
        },
      ) => {
        const animation = pieceAnimationsRef.current[pieceId].translate;
        const currentPosition = pieceCurrentPositionsRef.current[pieceId];
        const clusterSize = options?.clusterSize ?? 1;
        const immediate = options?.immediate ?? false;
        const isAlreadyAtTarget =
          Math.abs(currentPosition.x - target.x) < 0.5 &&
          Math.abs(currentPosition.y - target.y) < 0.5;

        if (!immediate && isAlreadyAtTarget) {
          return;
        }

        animation.stopAnimation();

        if (immediate) {
          animation.setValue(target);
          pieceCurrentPositionsRef.current[pieceId] = target;
          return;
        }

        const timingConfig = getDynamicMoveTiming(currentPosition, target, clusterSize);
        const moveAnimation = Animated.parallel([
          Animated.timing(animation.x, {
            toValue: target.x,
            useNativeDriver: false,
            duration: timingConfig.duration,
            easing: timingConfig.easing,
          }),
          Animated.timing(animation.y, {
            toValue: target.y,
            useNativeDriver: false,
            duration: timingConfig.duration,
            easing: timingConfig.easing,
          }),
        ]);

        if (timingConfig.delay > 0) {
          Animated.sequence([Animated.delay(timingConfig.delay), moveAnimation]).start();
          return;
        }

        moveAnimation.start();
      },
      [],
    );

    const animatePiecesToBoardTargets = useCallback(
      (pieceIds: number[], immediate = false) => {
        pieceIds.forEach(pieceId => {
          const slotIndex = pieceSlotMapRef.current[pieceId];
          if (slotIndex < 0) {
            return;
          }

          const slot = getRowCol(slotIndex);
          const clusterSize =
            pieceClusterMetaRef.current[pieceId]?.cluster.pieceIds.length ?? 1;
          animatePieceToPosition(
            pieceId,
            {
              x: slot.col * slotWidth,
              y: slot.row * slotHeight,
            },
            {
              clusterSize,
              immediate,
            },
          );
        });
      },
      [animatePieceToPosition, slotHeight, slotWidth],
    );

    useEffect(() => {
      if (boardPieces.length !== PIECE_COUNT) {
        return;
      }

      animatePiecesToBoardTargets(PIECE_IDS, shouldSnapPiecesRef.current);
      shouldSnapPiecesRef.current = false;
    }, [animatePiecesToBoardTargets, boardPieces]);

    const animateClusterScale = useCallback((pieceIds: number[], toValue: number) => {
      const clusterSize = pieceIds.length;

      pieceIds.forEach(pieceId => {
        Animated.spring(pieceAnimationsRef.current[pieceId].scale, {
          toValue,
          useNativeDriver: false,
          friction: PIECE_LIFT_SPRING.friction + Math.max(0, clusterSize - 1),
          tension: Math.max(
            34,
            PIECE_LIFT_SPRING.tension - Math.max(0, clusterSize - 1) * 2,
          ),
        }).start();
      });
    }, []);

    const handlePieceDragStart = useCallback(
      (pieceId: number) => {
        if (completed || completedLocal) {
          return;
        }

        const pieceMeta = pieceClusterMetaRef.current[pieceId];
        if (!pieceMeta) {
          return;
        }

        const cluster = pieceMeta.cluster;
        const startPositions = PIECE_IDS.map(index => ({
          x: pieceCurrentPositionsRef.current[index].x,
          y: pieceCurrentPositionsRef.current[index].y,
        }));

        cluster.pieceIds.forEach(clusterPieceId => {
          pieceAnimationsRef.current[clusterPieceId].translate.stopAnimation(
            value => {
              startPositions[clusterPieceId] = value;
              pieceCurrentPositionsRef.current[clusterPieceId] = value;
            },
          );
        });

        const anchorPieceIndex = cluster.localCells.findIndex(
          cell => cell.row === 0 && cell.col === 0,
        );
        const anchorPieceId =
          cluster.pieceIds[anchorPieceIndex >= 0 ? anchorPieceIndex : 0];

        activeDragRef.current = {
          cluster,
          pieceIds: cluster.pieceIds.slice(),
          startAnchorPosition: startPositions[anchorPieceId] ?? {
            x: cluster.anchor.col * slotWidth,
            y: cluster.anchor.row * slotHeight,
          },
          startPositions,
        };

        setActiveClusterId(cluster.id);
        animateClusterScale(cluster.pieceIds, 1.03);
      },
      [animateClusterScale, completed, completedLocal, slotHeight, slotWidth],
    );

    const handlePieceDragMove = useCallback(
      (_pieceId: number, gestureState: { dx: number; dy: number }) => {
        const activeDrag = activeDragRef.current;
        if (!activeDrag) {
          return;
        }

        activeDrag.pieceIds.forEach(activePieceId => {
          const startPosition = activeDrag.startPositions[activePieceId];
          pieceAnimationsRef.current[activePieceId].translate.setValue({
            x: startPosition.x + gestureState.dx,
            y: startPosition.y + gestureState.dy,
          });
        });
      },
      [],
    );

    const handlePieceDragCancel = useCallback(
      (_pieceId: number) => {
        const activeDrag = activeDragRef.current;
        if (!activeDrag) {
          return;
        }

        activeDragRef.current = null;
        setActiveClusterId(null);
        animateClusterScale(activeDrag.pieceIds, 1);
        animatePiecesToBoardTargets(activeDrag.pieceIds);
      },
      [animateClusterScale, animatePiecesToBoardTargets],
    );

    const handlePieceDragEnd = useCallback(
      (_pieceId: number, gestureState: { dx: number; dy: number }) => {
        const activeDrag = activeDragRef.current;
        if (!activeDrag) {
          return;
        }

        activeDragRef.current = null;
        setActiveClusterId(null);
        animateClusterScale(activeDrag.pieceIds, 1);

        if (completed || completedLocal) {
          animatePiecesToBoardTargets(activeDrag.pieceIds);
          return;
        }

        const droppedAnchorPosition = {
          x: activeDrag.startAnchorPosition.x + gestureState.dx,
          y: activeDrag.startAnchorPosition.y + gestureState.dy,
        };
        const nextBoardPieces = getNextBoardPiecesAfterDrop(
          boardPiecesRef.current,
          activeDrag.cluster,
          droppedAnchorPosition,
          slotWidth,
          slotHeight,
        );

        if (nextBoardPieces === boardPiecesRef.current) {
          animatePiecesToBoardTargets(activeDrag.pieceIds);
          return;
        }

        setBoardPieces(nextBoardPieces);
      },
      [
        animateClusterScale,
        animatePiecesToBoardTargets,
        completed,
        completedLocal,
        slotHeight,
        slotWidth,
      ],
    );

    if (!imageSource) {
      return renderLoading();
    }

    const borderColor = completed
      ? 'transparent'
      : completedLocal
      ? 'green'
      : GRID_COLOR;

    return (
      <View
        style={{
          borderWidth: completed ? 0 : 3,
          borderColor,
          borderRadius: 14,
          overflow: 'hidden',
          backgroundColor: GRID_COLOR,
        }}
      >
        {!imageReady ? (
          <View
            style={{
              width: normalizedBoardWidth,
              height: normalizedBoardHeight,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: GRID_COLOR,
            }}
          >
            <ActivityIndicator size="large" color="#fff" />
          </View>
        ) : completed || completedLocal ? (
          <View
            style={{
              width: normalizedBoardWidth,
              height: normalizedBoardHeight,
              borderRadius: 12,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: GRID_COLOR,
            }}
          >
            <Image
              source={imageSource}
              style={{
                width: normalizedBoardWidth,
                height: normalizedBoardHeight,
                borderRadius: 12,
              }}
              resizeMode="contain"
              fadeDuration={0}
            />
          </View>
        ) : (
          <View
            style={{
              width: normalizedBoardWidth,
              height: normalizedBoardHeight,
              overflow: 'hidden',
              backgroundColor: GRID_COLOR,
            }}
          >
            {PIECE_IDS.map(slotIndex => {
              const slot = getRowCol(slotIndex);

              return (
                <View
                  key={`grid-${slotIndex}`}
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: slot.row * slotHeight,
                    left: slot.col * slotWidth,
                    width: slotWidth,
                    height: slotHeight,
                    borderWidth: 1,
                    borderColor: GRID_COLOR,
                  }}
                />
              );
            })}

            {PIECE_IDS.map(pieceId => {
              const pieceMeta = pieceClusterMeta[pieceId];
              if (!pieceMeta) {
                return null;
              }

              return (
                <PieceTile
                  key={pieceId}
                  boardHeight={normalizedBoardHeight}
                  boardWidth={normalizedBoardWidth}
                  edgeMask={pieceMeta.edgeMask}
                  imageSource={imageSource}
                  isDragging={activeClusterId === pieceMeta.cluster.id}
                  onDragCancel={handlePieceDragCancel}
                  onDragEnd={handlePieceDragEnd}
                  onDragMove={handlePieceDragMove}
                  onDragStart={handlePieceDragStart}
                  pieceId={pieceId}
                  scale={pieceAnimationsRef.current[pieceId].scale}
                  slotHeight={slotHeight}
                  slotWidth={slotWidth}
                  translate={pieceAnimationsRef.current[pieceId].translate}
                  zIndex={
                    activeClusterId === pieceMeta.cluster.id
                      ? 100
                      : 10 + pieceMeta.cluster.slotIndices.length
                  }
                />
              );
            })}
          </View>
        )}
      </View>
    );
  },
);
