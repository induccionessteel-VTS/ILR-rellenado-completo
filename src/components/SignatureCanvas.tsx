import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import {
  Eraser,
  RotateCcw,
  PenTool,
  CheckCircle2,
  Sparkles,
  Upload,
  Image as ImageIcon,
  X,
  AlertTriangle,
  Sliders,
  Maximize2,
  RefreshCw,
  FileCheck2,
  HelpCircle,
} from 'lucide-react';

export interface SignatureCanvasHandle {
  getSignatureDataUrl: () => string | null;
  isEmpty: () => boolean;
  clear: () => void;
  insertSampleSignature: () => void;
}

interface SignatureCanvasProps {
  onSignatureChange?: (dataUrl: string | null) => void;
  height?: number;
}

interface PhotoValidationResult {
  isValid: boolean;
  score: number; // 0 to 100
  isBackgroundWhite: boolean;
  hasClearStroke: boolean;
  hasBlueInk: boolean;
  contrastRatio: number;
  reasons: string[];
}

export const SignatureCanvas = forwardRef<SignatureCanvasHandle, SignatureCanvasProps>(
  ({ onSignatureChange, height = 185 }, ref) => {
    const [mode, setMode] = useState<'draw' | 'upload'>('draw');
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Estado del modo dibujo
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);
    const [strokeWidth, setStrokeWidth] = useState<number>(2.5);
    const [history, setHistory] = useState<ImageData[]>([]);

    // Estado del modo subida y editor de foto
    const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
    const [processedSignatureUrl, setProcessedSignatureUrl] = useState<string | null>(null);
    const [validation, setValidation] = useState<PhotoValidationResult | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [forceBypassValidation, setForceBypassValidation] = useState<boolean>(false);

    // Parámetros de edición interactiva de foto
    const [bgSensitivity, setBgSensitivity] = useState<number>(195); // Umbral de luminancia (80 - 245)
    const [brightnessOffset, setBrightnessOffset] = useState<number>(15); // Ajuste de brillo (-50 a +80)
    const [contrastBoost, setContrastBoost] = useState<number>(30); // Ajuste de contraste/destacados (0 a 100)
    const [autoNormalizeLights, setAutoNormalizeLights] = useState<boolean>(true); // Balance de luz automático
    const [inkMode, setInkMode] = useState<'blue_ink' | 'pure_black'>('pure_black'); // Negro sólido por defecto o preservar azul
    const [previewBackground, setPreviewBackground] = useState<'checkerboard' | 'white'>('checkerboard');
    const [showAdvancedEditor, setShowAdvancedEditor] = useState<boolean>(true);

    const saveState = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory((prev) => [...prev.slice(-10), imgData]);
    };

    // Inicializar canvas de dibujo
    useEffect(() => {
      if (mode !== 'draw') return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = strokeWidth;

      saveState();
    }, [mode]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.lineWidth = strokeWidth;
    }, [strokeWidth]);

    const getCanvasCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      let clientX = 0;
      let clientY = 0;

      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      }

      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      saveState();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { x, y } = getCanvasCoordinates(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
      setHasDrawn(true);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return;
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { x, y } = getCanvasCoordinates(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const stopDrawing = () => {
      if (!isDrawing) return;
      setIsDrawing(false);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dataUrl = canvas.toDataURL('image/png');
      onSignatureChange?.(dataUrl);
    };

    const clear = () => {
      if (mode === 'draw') {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        setHasDrawn(false);
        setHistory([]);
        saveState();
      } else {
        setOriginalImage(null);
        setUploadedFileName(null);
        setProcessedSignatureUrl(null);
        setValidation(null);
        setForceBypassValidation(false);
      }
      onSignatureChange?.(null);
    };

    const undo = () => {
      const canvas = canvasRef.current;
      if (!canvas || history.length <= 1) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const newHistory = [...history];
      newHistory.pop();
      const previousState = newHistory[newHistory.length - 1];

      ctx.putImageData(previousState, 0, 0);
      setHistory(newHistory);
      if (newHistory.length <= 1) {
        setHasDrawn(false);
        onSignatureChange?.(null);
      } else {
        onSignatureChange?.(canvas.toDataURL('image/png'));
      }
    };

    const drawSampleSignature = () => {
      setMode('draw');
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        clear();
        saveState();

        ctx.save();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        // Firma manuscrita realista
        ctx.moveTo(60, 95);
        ctx.bezierCurveTo(90, 45, 130, 45, 150, 90);
        ctx.bezierCurveTo(165, 125, 170, 75, 200, 80);
        ctx.bezierCurveTo(220, 85, 230, 115, 260, 100);
        ctx.bezierCurveTo(290, 85, 310, 75, 350, 105);
        // Rúbrica inferior
        ctx.moveTo(55, 130);
        ctx.bezierCurveTo(160, 120, 270, 125, 360, 115);
        ctx.stroke();
        ctx.restore();

        setHasDrawn(true);
        const dataUrl = canvas.toDataURL('image/png');
        onSignatureChange?.(dataUrl);
      }, 50);
    };

    /**
     * Pre-procesador Fotográfico Automático:
     * Corrige balance de luz, brillo, contraste y destacados (highlights)
     * para convertir fondos grises/amarillentos en blanco óptimo antes de validar y extraer.
     */
    const enhancePhotoLighting = (
      imgData: ImageData,
      brightness: number,
      contrast: number,
      autoWhiteBalance: boolean
    ) => {
      const data = imgData.data;
      const lumHist = new Uint32Array(256);
      const totalPixels = data.length / 4;

      for (let i = 0; i < data.length; i += 4) {
        const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        lumHist[Math.min(255, Math.max(0, lum))]++;
      }

      // Buscar percentil 2% (sombras/tinta más oscura) y percentil 85% (papel de fondo)
      let pLow = 0;
      let pHigh = 255;
      let count = 0;
      for (let i = 0; i < 256; i++) {
        count += lumHist[i];
        if (count >= totalPixels * 0.02) {
          pLow = i;
          break;
        }
      }

      count = 0;
      for (let i = 255; i >= 0; i--) {
        count += lumHist[i];
        if (count >= totalPixels * 0.15) {
          pHigh = i;
          break;
        }
      }

      // Factor de contraste (fórmula estándar de procesamiento de imagen)
      const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      const range = Math.max(25, pHigh - pLow);

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // 1. Estiramiento de niveles y destacados (White Balance / Auto-Levels)
        if (autoWhiteBalance) {
          r = ((r - pLow) * 255) / range;
          g = ((g - pLow) * 255) / range;
          b = ((b - pLow) * 255) / range;

          // Empujar medios tonos claros (sombras de papel) hacia los destacados blancos
          const lumNorm = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          if (lumNorm > 0.55) {
            const highlightBoost = Math.pow(lumNorm, 0.65) / lumNorm;
            r *= highlightBoost;
            g *= highlightBoost;
            b *= highlightBoost;
          }
        }

        // 2. Aplicar Brillo
        r += brightness;
        g += brightness;
        b += brightness;

        // 3. Aplicar Contraste
        r = contrastFactor * (r - 128) + 128;
        g = contrastFactor * (g - 128) + 128;
        b = contrastFactor * (b - 128) + 128;

        data[i] = Math.min(255, Math.max(0, Math.round(r)));
        data[i + 1] = Math.min(255, Math.max(0, Math.round(g)));
        data[i + 2] = Math.min(255, Math.max(0, Math.round(b)));
      }
    };

    /**
     * Validador de Calidad y Criterios Legales:
     * Inspecciona la imagen buscando:
     * 1. Fondo blanco / claro sin sombras oscuras
     * 2. Presencia de trazo nítido de firma
     * 3. Lápiz pasta azul o tinta de buen contraste
     */
    const validatePhotoQuality = (
      imgData: ImageData,
      width: number,
      height: number
    ): PhotoValidationResult => {
      const data = imgData.data;
      const totalPixels = width * height;

      let edgeBrightnessSum = 0;
      let edgePixelCount = 0;

      let darkStrokePixelCount = 0;
      let blueInkPixelCount = 0;
      let strokeBrightnessSum = 0;

      // 1. Muestrear el fondo en el perímetro (bordes superior, inferior, laterales)
      const edgeThickness = Math.max(4, Math.floor(Math.min(width, height) * 0.05));
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const isEdge =
            x < edgeThickness ||
            x >= width - edgeThickness ||
            y < edgeThickness ||
            y >= height - edgeThickness;

          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;

          if (isEdge) {
            edgeBrightnessSum += lum;
            edgePixelCount++;
          }

          // Detección de trazo de tinta (píxeles notablemente más oscuros que un papel blanco)
          if (lum < 175) {
            darkStrokePixelCount++;
            strokeBrightnessSum += lum;

            // Detección específica de lápiz pasta azul:
            // En bolígrafo azul el canal azul domina respecto al rojo y verde
            if (b > r + 14 && b > g + 5 && b > 40) {
              blueInkPixelCount++;
            }
          }
        }
      }

      const avgBackgroundLum = edgeBrightnessSum / Math.max(1, edgePixelCount);
      const strokeCoveragePercent = (darkStrokePixelCount / totalPixels) * 100;
      const avgStrokeLum =
        darkStrokePixelCount > 0 ? strokeBrightnessSum / darkStrokePixelCount : 0;
      const contrastRatio = avgBackgroundLum - avgStrokeLum;

      const reasons: string[] = [];

      // Criterio 1: Fondo blanco / bien iluminado (evaluado post-optimización de luz)
      const isBackgroundWhite = avgBackgroundLum >= 135;
      if (!isBackgroundWhite) {
        reasons.push(
          'El fondo es demasiado oscuro o tiene sombras pronunciadas. Use el control deslizante de brillo/umbral o tome la foto con mejor luz.'
        );
      }

      // Criterio 2: Presencia de trazo de firma
      const hasMinStroke = darkStrokePixelCount >= 80 && strokeCoveragePercent >= 0.08;
      const isNotOverwhelmed = strokeCoveragePercent <= 65;
      const hasClearStroke = hasMinStroke && isNotOverwhelmed;

      if (!hasMinStroke) {
        reasons.push(
          'No se detectó un trazo claro de firma. La imagen está prácticamente en blanco o la firma es muy tenue.'
        );
      } else if (!isNotOverwhelmed) {
        reasons.push(
          'La imagen contiene demasiados elementos oscuros o sombras fuertes. Ajuste el deslizador de umbral para limpiar el fondo.'
        );
      }

      // Criterio 3: Contraste
      const hasGoodContrast = contrastRatio >= 35;
      if (!hasGoodContrast && hasMinStroke) {
        reasons.push(
          'El contraste entre la tinta y el papel es bajo. Suba el control de Contraste en el panel de ajuste.'
        );
      }

      // Criterio 4: Lápiz pasta azul (altamente recomendado)
      const hasBlueInk = blueInkPixelCount >= Math.max(20, darkStrokePixelCount * 0.06);

      const isValid = isBackgroundWhite && hasClearStroke && hasGoodContrast;

      let score = 50;
      if (isBackgroundWhite) score += 25;
      if (hasClearStroke) score += 15;
      if (hasBlueInk) score += 10;
      if (!hasGoodContrast) score -= 30;

      return {
        isValid,
        score: Math.min(100, Math.max(0, score)),
        isBackgroundWhite,
        hasClearStroke,
        hasBlueInk,
        contrastRatio,
        reasons,
      };
    };

    /**
     * Algoritmo de Binarización, Remoción de Fondo Adaptativo y Recorte Automático (Bounding Box)
     */
    const processImageWithPipeline = useCallback(
      (
        img: HTMLImageElement,
        sensitivity: number,
        currentInkMode: 'blue_ink' | 'pure_black',
        brightness: number = brightnessOffset,
        contrast: number = contrastBoost,
        autoLight: boolean = autoNormalizeLights,
        bypassLock: boolean = forceBypassValidation
      ) => {
        // Dimensionar canvas de análisis (máx 900px para nitidez óptima)
        const maxDim = 900;
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h / w) * maxDim);
            w = maxDim;
          } else {
            w = Math.round((w / h) * maxDim);
            h = maxDim;
          }
        }

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return null;

        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        // PASO 1: Mejorar iluminación, brillo, contraste y destacados antes de validar y extraer
        enhancePhotoLighting(imgData, brightness, contrast, autoLight);

        // PASO 2: Validar calidad sobre la imagen ya mejorada
        const validationResult = validatePhotoQuality(imgData, w, h);
        setValidation(validationResult);

        // Si no cumple los criterios y el usuario no ha forzado la edición manual, mostrar alerta
        if (!validationResult.isValid && !bypassLock) {
          onSignatureChange?.(null);
          setProcessedSignatureUrl(null);
          return null;
        }

        // Estimar el color de papel blanco/crema del fondo
        let bgRSum = 0;
        let bgGSum = 0;
        let bgBSum = 0;
        let bgCount = 0;

        for (let i = 0; i < data.length; i += 16) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          if (lum > sensitivity - 30) {
            bgRSum += r;
            bgGSum += g;
            bgBSum += b;
            bgCount++;
          }
        }

        const estBgR = bgCount > 0 ? bgRSum / bgCount : 245;
        const estBgG = bgCount > 0 ? bgGSum / bgCount : 245;
        const estBgB = bgCount > 0 ? bgBSum / bgCount : 245;

        // Bounding box para auto-recorte
        let minX = w;
        let minY = h;
        let maxX = 0;
        let maxY = 0;
        let visibleStrokeCount = 0;

        // PASO 3: Binarización y Transparencia por Luminancia
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;

            // Distancia al color del papel
            const dr = r - estBgR;
            const dg = g - estBgG;
            const db = b - estBgB;
            const colorDist = Math.sqrt(dr * dr + dg * dg + db * db);

            // Detección de azul de bolígrafo
            const isBlueInk = b > r + 12 && b > g + 4;

            // Si el píxel es más claro que el umbral (papel), se vuelve 100% transparente
            if (lum >= sensitivity || (colorDist < 22 && !isBlueInk)) {
              data[idx + 3] = 0; // Alpha 0 = 100% Transparente
            } else {
              // Píxel oscuro (tinta)
              visibleStrokeCount++;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;

              // Suavizado en bordes de trazo para evitar dientes de sierra
              const edgeAlpha = Math.min(255, Math.max(0, Math.round(((sensitivity - lum) / 35) * 255)));

              if (currentInkMode === 'blue_ink') {
                // Modo Lápiz Pasta Azul: Resaltar la tinta azul del bolígrafo
                if (isBlueInk) {
                  data[idx] = Math.max(5, Math.min(r, 45)); // Rojo bajo
                  data[idx + 1] = Math.max(25, Math.min(g, 90)); // Verde medio
                  data[idx + 2] = Math.max(140, Math.min(b + 30, 240)); // Azul intenso
                  data[idx + 3] = edgeAlpha > 150 ? 255 : edgeAlpha;
                } else {
                  // Trazo oscuro neutro: intensificar
                  data[idx] = Math.min(r, 25);
                  data[idx + 1] = Math.min(g, 35);
                  data[idx + 2] = Math.min(b, 65);
                  data[idx + 3] = edgeAlpha > 150 ? 255 : edgeAlpha;
                }
              } else {
                // Modo Binarización a Negro Sólido Legal (0, 0, 0)
                data[idx] = 0;     // R = 0 (Negro sólido)
                data[idx + 1] = 0; // G = 0 (Negro sólido)
                data[idx + 2] = 0; // B = 0 (Negro sólido)
                data[idx + 3] = edgeAlpha > 120 ? 255 : edgeAlpha; // Opaco en el centro del trazo
              }
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);

        // Auto-recorte con padding inteligente
        if (visibleStrokeCount > 40 && maxX > minX && maxY > minY) {
          const padding = 20;
          const cropX = Math.max(0, minX - padding);
          const cropY = Math.max(0, minY - padding);
          const cropW = Math.min(w - cropX, maxX - minX + padding * 2);
          const cropH = Math.min(h - cropY, maxY - minY + padding * 2);

          const croppedCanvas = document.createElement('canvas');
          croppedCanvas.width = cropW;
          croppedCanvas.height = cropH;
          const croppedCtx = croppedCanvas.getContext('2d');
          if (croppedCtx) {
            croppedCtx.drawImage(tempCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
            const finalDataUrl = croppedCanvas.toDataURL('image/png');
            setProcessedSignatureUrl(finalDataUrl);
            onSignatureChange?.(finalDataUrl);
            return finalDataUrl;
          }
        }

        const fallbackUrl = tempCanvas.toDataURL('image/png');
        setProcessedSignatureUrl(fallbackUrl);
        onSignatureChange?.(fallbackUrl);
        return fallbackUrl;
      },
      [onSignatureChange, brightnessOffset, contrastBoost, autoNormalizeLights, forceBypassValidation]
    );

    /**
     * Manejador de carga de archivo
     */
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploadedFileName(file.name);
      setIsAnalyzing(true);
      setForceBypassValidation(false);

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setOriginalImage(img);
          processImageWithPipeline(
            img,
            bgSensitivity,
            inkMode,
            brightnessOffset,
            contrastBoost,
            autoNormalizeLights,
            false
          );
          setIsAnalyzing(false);
        };
        img.onerror = () => {
          setIsAnalyzing(false);
          setValidation({
            isValid: false,
            score: 0,
            isBackgroundWhite: false,
            hasClearStroke: false,
            hasBlueInk: false,
            contrastRatio: 0,
            reasons: ['No se pudo leer el archivo de imagen. Formato no compatible.'],
          });
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    };

    // Re-procesar en tiempo real cuando el usuario mueve los controles de edición
    const handleReprocess = (
      newSensitivity: number,
      newInkMode: 'blue_ink' | 'pure_black',
      newBrightness: number = brightnessOffset,
      newContrast: number = contrastBoost,
      newAutoLight: boolean = autoNormalizeLights,
      bypass: boolean = forceBypassValidation
    ) => {
      setBgSensitivity(newSensitivity);
      setInkMode(newInkMode);
      setBrightnessOffset(newBrightness);
      setContrastBoost(newContrast);
      setAutoNormalizeLights(newAutoLight);
      if (originalImage) {
        processImageWithPipeline(
          originalImage,
          newSensitivity,
          newInkMode,
          newBrightness,
          newContrast,
          newAutoLight,
          bypass
        );
      }
    };

    // Permitir desbloquear manualmente una foto rechazada para limpiarla con los sliders
    const handleForceManualEdit = () => {
      setForceBypassValidation(true);
      setShowAdvancedEditor(true);
      if (originalImage) {
        processImageWithPipeline(
          originalImage,
          bgSensitivity,
          inkMode,
          brightnessOffset,
          contrastBoost,
          autoNormalizeLights,
          true
        );
      }
    };

    useImperativeHandle(ref, () => ({
      getSignatureDataUrl: () => {
        if (mode === 'upload' && processedSignatureUrl && (validation?.isValid || forceBypassValidation)) {
          return processedSignatureUrl;
        }
        if (mode === 'draw' && hasDrawn && canvasRef.current) {
          return canvasRef.current.toDataURL('image/png');
        }
        return null;
      },
      isEmpty: () => {
        if (mode === 'upload') return !processedSignatureUrl || (!validation?.isValid && !forceBypassValidation);
        return !hasDrawn;
      },
      clear,
      insertSampleSignature: drawSampleSignature,
    }));

    const isSignatureReady =
      mode === 'upload' ? !!processedSignatureUrl && (!!validation?.isValid || forceBypassValidation) : hasDrawn;

    return (
      <div className="space-y-3">
        {/* Selector de Modo: Dibujar en Canvas vs Subir Foto */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800">
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setMode('draw')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
                mode === 'draw'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Dibujar en Pantalla</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('upload')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition ${
                mode === 'upload'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Subir / Tomar Foto de Firma</span>
            </button>
          </div>

          {/* Herramientas según el modo */}
          {mode === 'draw' ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setStrokeWidth(1.5)}
                  className={`px-2 py-0.5 rounded font-medium ${strokeWidth === 1.5 ? 'bg-sky-600 text-white' : 'text-slate-400'}`}
                >
                  Fino
                </button>
                <button
                  type="button"
                  onClick={() => setStrokeWidth(2.5)}
                  className={`px-2 py-0.5 rounded font-medium ${strokeWidth === 2.5 ? 'bg-sky-600 text-white' : 'text-slate-400'}`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setStrokeWidth(4.0)}
                  className={`px-2 py-0.5 rounded font-medium ${strokeWidth === 4.0 ? 'bg-sky-600 text-white' : 'text-slate-400'}`}
                >
                  Grueso
                </button>
              </div>

              <button
                type="button"
                onClick={drawSampleSignature}
                className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-lg border border-amber-500/30 text-[11px] font-semibold transition"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span className="hidden sm:inline">Firma Ejemplo</span>
              </button>
              <button
                type="button"
                onClick={undo}
                disabled={history.length <= 1}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-lg border border-slate-700 transition"
                title="Deshacer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={clear}
                className="p-1.5 bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-200 rounded-lg border border-slate-700 transition"
                title="Borrar"
              >
                <Eraser className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {originalImage && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedEditor(!showAdvancedEditor)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-xs transition"
                  >
                    <Sliders className="w-3.5 h-3.5 text-sky-400" />
                    <span>{showAdvancedEditor ? 'Ocultar Ajustes' : 'Calibrar Luz y Fondo'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={clear}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-300 rounded-lg border border-slate-700 text-xs transition"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Quitar</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* MODO 1: CANVAS DE DIBUJO DIRECTO */}
        {/* =================================================================== */}
        {mode === 'draw' && (
          <div className="relative rounded-xl border-2 border-dashed border-slate-700 bg-white shadow-inner overflow-hidden">
            <canvas
              ref={canvasRef}
              style={{ height: `${height}px`, width: '100%', touchAction: 'none' }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="cursor-crosshair w-full block"
            />

            <div className="pointer-events-none absolute bottom-8 left-10 right-10 flex items-center justify-between border-b border-slate-300 pb-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Firme dentro de este recuadro (Idéntica a su Cédula de Identidad)
              </span>
              <span className="text-[10px] text-slate-400">X ____________________</span>
            </div>

            {hasDrawn && (
              <div className="absolute top-2 right-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Firma Capturada
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* MODO 2: SUBIDA Y EDITOR AVANZADO DE FOTO CON AUTO-LUZ Y BINARIZACIÓN */}
        {/* =================================================================== */}
        {mode === 'upload' && (
          <div className="space-y-3">
            {/* Si no hay imagen cargada: Instrucciones y Dropzone */}
            {!originalImage ? (
              <div className="space-y-3">
                {/* Requisitos y Recomendaciones Oficiales */}
                <div className="bg-sky-950/40 border border-sky-800/60 p-3.5 rounded-xl text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sky-300">
                    <HelpCircle className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>Criterios Obligatorios para la Fotografía de Firma:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-300 text-[11px] pt-1">
                    <div className="flex items-start gap-1.5 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <span className="text-base">📄</span>
                      <div>
                        <div className="font-semibold text-white">Hoja Blanca Lisa</div>
                        <div className="text-slate-400">Sin líneas, cuadros, sombras ni arrugas.</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <span className="text-base">🖊️</span>
                      <div>
                        <div className="font-semibold text-white">Lápiz Pasta Azul o Negro</div>
                        <div className="text-slate-400">Se binarizará a negro sólido o azul intenso.</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <span className="text-base">💡</span>
                      <div>
                        <div className="font-semibold text-white">Auto-Balance de Luz</div>
                        <div className="text-slate-400">El sistema corrige sombras y brillo automáticamente.</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dropzone de subida / cámara */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer border-2 border-dashed border-sky-600/50 hover:border-sky-500 rounded-xl p-8 bg-slate-900/60 hover:bg-slate-900 transition flex flex-col items-center justify-center text-center space-y-3"
                >
                  <div className="p-3 bg-sky-500/10 text-sky-400 rounded-full">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">
                      Haz clic aquí para tomar una foto o subir imagen de la firma
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Formatos: PNG, JPG, JPEG o WebP. Abre directamente la cámara en dispositivos móviles.
                    </div>
                  </div>
                  <span className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow transition">
                    Tomar / Seleccionar Fotografía
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 1. Alerta de Rechazo si la foto no cumple los criterios (con opción de forzar edición manual) */}
                {validation && !validation.isValid && !forceBypassValidation && (
                  <div className="p-4 rounded-xl bg-red-950/80 border-2 border-red-600 text-red-200 space-y-3 shadow-xl animate-in fade-in">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-white">
                          Fotografía Observada: Requiere Mejor Luz o Ajuste Manual
                        </h4>
                        <p className="text-xs text-red-200">
                          Incluso tras aplicar el auto-balance de luz, el sistema detectó lo siguiente:
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-950/70 p-3 rounded-lg border border-red-900/60 space-y-1.5 text-xs">
                      {validation.reasons.map((reason, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-red-300">
                          <span className="text-red-500 font-bold">•</span>
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>

                    <div className="p-3 bg-red-900/30 rounded-lg text-xs text-red-100 flex items-center gap-2">
                      <span className="font-bold">Opciones:</span>
                      <span>
                        Puede tomar una nueva foto sobre <strong>papel blanco</strong> o usar el <strong>Editor Manual de Umbral y Brillo</strong> para quitar el fondo usted mismo.
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleForceManualEdit}
                        className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Limpiar Fondo Manualmente (Usar esta Foto)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Sacar / Subir Nueva Foto</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode('draw')}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
                      >
                        <PenTool className="w-3.5 h-3.5 text-sky-400" />
                        <span>Firmar Dibujando en Pantalla</span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                  </div>
                )}

                {/* 2. Visualizador y Editor en Tiempo Real si la foto es Aceptada o Forzada Manualmente */}
                {validation && (validation.isValid || forceBypassValidation) && processedSignatureUrl && (
                  <div className="rounded-xl border border-slate-700 bg-slate-950 p-4 space-y-4">
                    {/* Barra de Estado Positivo */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            <span>Firma Procesada y Fondo 100% Transparente</span>
                            {validation.hasBlueInk && inkMode === 'blue_ink' && (
                              <span className="px-2 py-0.5 bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[10px] rounded-full font-medium">
                                Lápiz Pasta Azul Identificado
                              </span>
                            )}
                            {inkMode === 'pure_black' && (
                              <span className="px-2 py-0.5 bg-slate-800 border border-slate-600 text-slate-200 text-[10px] rounded-full font-medium">
                                Binarizada a Negro Sólido
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Archivo: <span className="font-mono text-slate-300">{uploadedFileName}</span> (Nitidez post-balance: {validation.score}/100)
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewBackground(previewBackground === 'checkerboard' ? 'white' : 'checkerboard')
                          }
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-700 text-xs flex items-center gap-1 transition"
                          title="Alternar fondo para verificar transparencia"
                        >
                          <Maximize2 className="w-3 h-3 text-sky-400" />
                          <span>{previewBackground === 'checkerboard' ? 'Ver en Papel Blanco' : 'Ver Transparencia'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 rounded-lg text-xs font-semibold transition"
                        >
                          Cambiar Foto
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </div>
                    </div>

                    {/* Lienzo de Vista Previa de la Firma Extraída */}
                    <div className="relative rounded-xl border border-slate-800 overflow-hidden flex flex-col items-center justify-center p-6 min-h-[170px] bg-slate-900/50">
                      {previewBackground === 'checkerboard' ? (
                        /* Malla de transparencia ajedrezada */
                        <div
                          className="w-full max-w-md h-36 rounded-lg border border-slate-700 flex items-center justify-center p-3 shadow-inner"
                          style={{
                            backgroundImage: `
                              linear-gradient(45deg, #1e293b 25%, transparent 25%),
                              linear-gradient(-45deg, #1e293b 25%, transparent 25%),
                              linear-gradient(45deg, transparent 75%, #1e293b 75%),
                              linear-gradient(-45deg, transparent 75%, #1e293b 75%)
                            `,
                            backgroundSize: '16px 16px',
                            backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                            backgroundColor: '#0f172a',
                          }}
                        >
                          <img
                            src={processedSignatureUrl}
                            alt="Firma procesada con canal alfa transparente"
                            className="max-h-28 object-contain filter drop-shadow-sm"
                          />
                        </div>
                      ) : (
                        /* Hoja de papel blanco simulada */
                        <div className="w-full max-w-md h-36 rounded-lg bg-white border border-slate-300 flex items-center justify-center p-3 shadow-sm">
                          <img
                            src={processedSignatureUrl}
                            alt="Firma en papel"
                            className="max-h-28 object-contain"
                          />
                        </div>
                      )}

                      <div className="text-[11px] text-slate-400 mt-2 text-center">
                        {previewBackground === 'checkerboard'
                          ? '✨ El fondo ajedrezado indica transparencia total: el PDF solo imprimirá el trazo exacto de la firma sin ningún cuadro blanco.'
                          : '📄 Vista de cómo quedará incrustada sobre el documento legal oficial.'}
                      </div>
                    </div>

                    {/* Panel de Ajuste Interactivo en Tiempo Real (Umbral, Luz, Contraste y Tinta) */}
                    {showAdvancedEditor && (
                      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-4 animate-in fade-in">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Sliders className="w-3.5 h-3.5 text-sky-400" />
                            <span>Calibración en Tiempo Real (Binarización y Limpieza de Fondo):</span>
                          </div>

                          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={autoNormalizeLights}
                              onChange={(e) =>
                                handleReprocess(
                                  bgSensitivity,
                                  inkMode,
                                  brightnessOffset,
                                  contrastBoost,
                                  e.target.checked
                                )
                              }
                              className="rounded accent-sky-500"
                            />
                            <span>Auto-Balance de Luz y Destacados</span>
                          </label>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                          {/* Slider 1: Umbral de Tolerancia (Binarización) */}
                          <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-200 font-semibold">1. Umbral de Borrado de Fondo</span>
                              <span className="font-mono text-sky-400 font-bold">{bgSensitivity}</span>
                            </div>
                            <input
                              type="range"
                              min={80}
                              max={245}
                              value={bgSensitivity}
                              onChange={(e) =>
                                handleReprocess(
                                  Number(e.target.value),
                                  inkMode,
                                  brightnessOffset,
                                  contrastBoost,
                                  autoNormalizeLights
                                )
                              }
                              className="w-full accent-sky-500 cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] text-slate-500">
                              <span>Borrar más sombras</span>
                              <span>Engrosar trazo</span>
                            </div>
                          </div>

                          {/* Slider 2: Brillo de Fotografía */}
                          <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-200 font-semibold">2. Brillo de Papel</span>
                              <span className="font-mono text-sky-400 font-bold">
                                {brightnessOffset > 0 ? `+${brightnessOffset}` : brightnessOffset}
                              </span>
                            </div>
                            <input
                              type="range"
                              min={-40}
                              max={80}
                              value={brightnessOffset}
                              onChange={(e) =>
                                handleReprocess(
                                  bgSensitivity,
                                  inkMode,
                                  Number(e.target.value),
                                  contrastBoost,
                                  autoNormalizeLights
                                )
                              }
                              className="w-full accent-sky-500 cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] text-slate-500">
                              <span>Oscurecer</span>
                              <span>Aclarar papel gris</span>
                            </div>
                          </div>

                          {/* Slider 3: Contraste y Destacados */}
                          <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-200 font-semibold">3. Contraste / Destacados</span>
                              <span className="font-mono text-sky-400 font-bold">{contrastBoost}%</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={90}
                              value={contrastBoost}
                              onChange={(e) =>
                                handleReprocess(
                                  bgSensitivity,
                                  inkMode,
                                  brightnessOffset,
                                  Number(e.target.value),
                                  autoNormalizeLights
                                )
                              }
                              className="w-full accent-sky-500 cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] text-slate-500">
                              <span>Suave</span>
                              <span>Máximo contraste</span>
                            </div>
                          </div>
                        </div>

                        {/* Modo de Color de Tinta */}
                        <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-800/80">
                          <span className="text-[11px] text-slate-300 font-medium">
                            Acabado del Trazo (Binarización):
                          </span>
                          <div className="grid grid-cols-2 gap-2 sm:w-80">
                            <button
                              type="button"
                              onClick={() =>
                                handleReprocess(
                                  bgSensitivity,
                                  'pure_black',
                                  brightnessOffset,
                                  contrastBoost,
                                  autoNormalizeLights
                                )
                              }
                              className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition ${
                                inkMode === 'pure_black'
                                  ? 'bg-slate-700 border-sky-400 text-white shadow'
                                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                              }`}
                            >
                              ⬛ Negro Sólido Puro
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleReprocess(
                                  bgSensitivity,
                                  'blue_ink',
                                  brightnessOffset,
                                  contrastBoost,
                                  autoNormalizeLights
                                )
                              }
                              className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition ${
                                inkMode === 'blue_ink'
                                  ? 'bg-blue-600/30 border-blue-500 text-blue-300 shadow'
                                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                              }`}
                            >
                              🖊️ Lápiz Pasta Azul
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Nota al pie */}
        <p className="text-[11px] text-slate-400">
          Nota legal: La firma digital (manuscrita o por fotografía validada) será incrustada con canal alfa transparente en la Página 22 del Acta IRL DS 44 (VELTS-D-ACN212-HS-0012) y en el Consentimiento Informado.
        </p>
      </div>
    );
  }
);

SignatureCanvas.displayName = 'SignatureCanvas';