import { startPlayer, stopPlayer } from "@services/ios-services/nativePlayer";

type TogglePlayParams = {
    voiceUri?: string;
    isPlaying?: boolean;
    setIsPlaying?: React.Dispatch<React.SetStateAction<boolean>>;
    playerId?: string;
    setActivePlayer?: (id: string | null) => void;
};

export default function togglePlay({
    voiceUri,
    isPlaying,
    setIsPlaying,
    playerId,
    setActivePlayer,
}: TogglePlayParams) {
    if (isPlaying || !voiceUri) {
        stopPlayer();
        setIsPlaying && setIsPlaying(false);
        setActivePlayer && setActivePlayer(null);
    } else {
        setActivePlayer && setActivePlayer(playerId || null);
        startPlayer(voiceUri);
        setIsPlaying && setIsPlaying(true);
        console.log(isPlaying);
        
    }
}