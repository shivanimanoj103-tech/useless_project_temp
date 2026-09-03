import { useEffect, useRef, useState } from 'react';

export function useWebcam() {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const [isReady,   setIsReady]   = useState(false);
  const [error,     setError]     = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width:      { ideal: 640 },
            height:     { ideal: 480 },
            facingMode: 'user',
          },
          audio: false,
        });

        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            if (!mounted) return;
            videoRef.current.play().catch(() => {});
            setIsReady(true);
            setIsLoading(false);
          };
        }
      } catch (err) {
        if (!mounted) return;
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Camera access denied. Please allow camera permissions and reload the page.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found. Please connect a webcam and reload.');
        } else {
          setError(`Camera error: ${err.message}`);
        }
        setIsLoading(false);
      }
    }

    startCamera();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return { videoRef, isReady, error, isLoading };
}
