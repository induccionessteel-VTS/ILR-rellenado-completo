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

    // Parámetros de edición interactiva de foto
    const [bgSensitivity, setBgSensitivity] = useState<number>(190); // Umbral de fondo (140 - 240)
    const [inkMode, setInkMode] = useState<'blue_ink' | 'pure_black'>('blue_ink'); // Preservar lápiz azul vs negro legal
    const [previewBackground, setPreviewBackground] = useState<'checkerboard' | 'white'>('checkerboard');
    const [showAdvancedEditor, setShowAdvancedEditor] = useState<boolean>(false);

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

      // Criterio 1: Fondo blanco / bien iluminado
      const isBackgroundWhite = avgBackgroundLum >= 148;
      if (!isBackgroundWhite) {
        reasons.push(
          'El fondo es demasiado oscuro o tiene sombras pronunciadas. Debe tomarse sobre una hoja de papel blanco bien iluminada.'
        );
      }

      // Criterio 2: Presencia de trazo de firma
      const hasMinStroke = darkStrokePixelCount >= 120 && strokeCoveragePercent >= 0.12;
      const isNotOverwhelmed = strokeCoveragePercent <= 52;
      const hasClearStroke = hasMinStroke && isNotOverwhelmed;

      if (!hasMinStroke) {
        reasons.push(
          'No se detectó un trazo claro de firma. La imagen está prácticamente en blanco o la firma no es perceptible.'
        );
      } else if (!isNotOverwhelmed) {
        reasons.push(
          'La imagen contiene demasiados elementos oscuros o ruido que no corresponden a una firma sobre papel blanco.'
        );
      }

      // Criterio 3: Contraste
      const hasGoodContrast = contrastRatio >= 42;
      if (!hasGoodContrast && hasMinStroke) {
        reasons.push(
          'El contraste entre la tinta y el papel es insuficiente para garantizar su validez jurídica.'
        );
      }

      // Criterio 4: Lápiz pasta azul (altamente recomendado)
      const hasBlueInk = blueInkPixelCount >= Math.max(25, darkStrokePixelCount * 0.08);

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
     * Algoritmo de Remoción de Fondo Adaptativo y Recorte Automático (Bounding Box)
     */
    const processImageWithPipeline = useCallback(
      (
        img: HTMLImageElement,
        sensitivity: number,
        currentInkMode: 'blue_ink' | 'pure_black'
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

        // Validar calidad
        const validationResult = validatePhotoQuality(imgData, w, h);
        setValidation(validationResult);

        // Si no cumple los criterios de calidad mínimos, no aceptar
        if (!validationResult.isValid) {
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

        // Procesar píxeles para fondo transparente
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

            // Si es papel claro o la distancia es muy baja respecto al papel, hacerlo transparente
            if (lum >= sensitivity || (colorDist < 26 && !isBlueInk)) {
              data[idx + 3] = 0; // Alpha transparente
            } else {
              // Píxel de trazo (tinta)
              visibleStrokeCount++;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;

              // Suavizado en bordes de trazo
              const edgeAlpha = Math.min(255, Math.max(0, Math.round(((sensitivity - lum) / 45) * 255)));

              if (currentInkMode === 'blue_ink') {
                // Modo Lápiz Pasta Azul: Resaltar la tinta azul del bolígrafo
                if (isBlueInk) {
                  data[idx] = Math.max(5, Math.min(r, 45)); // Rojo bajo
                  data[idx + 1] = Math.max(25, Math.min(g, 90)); // Verde medio
                  data[idx + 2] = Math.max(140, Math.min(b + 30, 240)); // Azul intenso
                  data[idx + 3] = edgeAlpha > 180 ? 255 : edgeAlpha;
                } else {
                  // Trazo oscuro neutro: intensificar
                  data[idx] = Math.min(r, 35);
                  data[idx + 1] = Math.min(g, 45);
                  data[idx + 2] = Math.min(b, 75);
                  data[idx + 3] = edgeAlpha > 180 ? 255 : edgeAlpha;
                }
              } else {
                // Modo Negro Legal Monocromático (pdf-lib 100% puro)
                data[idx] = 12;
                data[idx + 1] = 15;
                data[idx + 2] = 20;
                data[idx + 3] = edgeAlpha > 160 ? 255 : edgeAlpha;
              }
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);

        // Auto-recorte con padding inteligente
        if (visibleStrokeCount > 50 && maxX > minX && maxY > minY) {
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
      [onSignatureChange]
    );

    /**
     * Manejador de carga de archivo
     */
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploadedFileName(file.name);
      setIsAnalyzing(true);

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setOriginalImage(img);
          processImageWithPipeline(img, bgSensitivity, inkMode);
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

    // Re-procesar cuando el usuario mueve los controles de edición
    const handleReprocess = (newSensitivity: number, newInkMode: 'blue_ink' | 'pure_black') => {
      setBgSensitivity(newSensitivity);
      setInkMode(newInkMode);
      if (originalImage) {
        processImageWithPipeline(originalImage, newSensitivity, newInkMode);
      }
    };

    useImperativeHandle(ref, () => ({
      getSignatureDataUrl: () => {
        if (mode === 'upload' && processedSignatureUrl && validation?.isValid) {
          return processedSignatureUrl;
        }
        if (mode === 'draw' && hasDrawn && canvasRef.current) {
          return canvasRef.current.toDataURL('image/png');
        }
        return null;
      },
      isEmpty: () => {
        if (mode === 'upload') return !processedSignatureUrl || !validation?.isValid;
        return !hasDrawn;
      },
      clear,
      insertSampleSignature: drawSampleSignature,
    }));

    const isSignatureReady =
      mode === 'upload' ? !!processedSignatureUrl && !!validation?.isValid : hasDrawn;

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
              <span>Subir Foto de Firma</span>
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
                    <span>{showAdvancedEditor ? 'Ocultar Ajustes' : 'Ajustar Fondo'}</span>
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
        {/* MODO 2: SUBIDA Y EDITOR AVANZADO DE FOTO CON VALIDACIÓN ESTRICTA */}
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
                        <div className="font-semibold text-white">Lápiz Pasta Azul</div>
                        <div className="text-slate-400">Requerido para verificar autenticidad del trazo.</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <span className="text-base">💡</span>
                      <div>
                        <div className="font-semibold text-white">Buena Iluminación</div>
                        <div className="text-slate-400">Luz directa, sin que el celular genere sombra.</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dropzone de subida */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer border-2 border-dashed border-sky-600/50 hover:border-sky-500 rounded-xl p-8 bg-slate-900/60 hover:bg-slate-900 transition flex flex-col items-center justify-center text-center space-y-3"
                >
                  <div className="p-3 bg-sky-500/10 text-sky-400 rounded-full">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">
                      Haz clic aquí o arrastra la foto de tu firma
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Formatos: PNG, JPG, JPEG o WebP. Puede ser tomada directamente con la cámara del teléfono.
                    </div>
                  </div>
                  <span className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow transition">
                    Seleccionar Fotografía
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 1. Alerta de Rechazo si la foto no cumple los criterios */}
                {validation && !validation.isValid && (
                  <div className="p-4 rounded-xl bg-red-950/80 border-2 border-red-600 text-red-200 space-y-3 shadow-xl animate-in fade-in">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-white">
                          Fotografía Rechazada: No Cumple los Criterios de Legibilidad Legal
                        </h4>
                        <p className="text-xs text-red-200">
                          El sistema analizó la fotografía y detectó los siguientes problemas:
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
                      <span className="font-bold">Instrucción:</span>
                      <span>
                        Por favor, saque de nuevo la foto sobre una <strong>hoja de papel blanco liso</strong> con <strong>lápiz pasta azul</strong> y buena iluminación.
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
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
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                  </div>
                )}

                {/* 2. Visualizador y Editor si la foto es Aceptada */}
                {validation && validation.isValid && processedSignatureUrl && (
                  <div className="rounded-xl border border-slate-700 bg-slate-950 p-4 space-y-4">
                    {/* Barra de Estado Positivo */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            <span>Firma Aprobada y Fondo 100% Removido</span>
                            {validation.hasBlueInk && (
                              <span className="px-2 py-0.5 bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[10px] rounded-full font-medium">
                                Lápiz Pasta Azul Identificado
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Archivo: <span className="font-mono text-slate-300">{uploadedFileName}</span> (Puntuación de nitidez: {validation.score}/100)
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
                          accept="image/png, image/jpeg, image/jpg, image/webp"
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

                    {/* Panel de Ajuste Interactivo (Fondo y Tinta) */}
                    {showAdvancedEditor && (
                      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3 animate-in fade-in">
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-sky-400" />
                          <span>Ajuste Fino de Remoción de Fondo y Color de Tinta:</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                          {/* Slider de Sensibilidad de Fondo */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-300 font-medium">Sensibilidad de Fondo Blanco</span>
                              <span className="font-mono text-sky-400">{bgSensitivity}</span>
                            </div>
                            <input
                              type="range"
                              min={150}
                              max={230}
                              value={bgSensitivity}
                              onChange={(e) => handleReprocess(Number(e.target.value), inkMode)}
                              className="w-full accent-sky-500 cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] text-slate-500">
                              <span>Menos agresivo</span>
                              <span>Remover más sombras</span>
                            </div>
                          </div>

                          {/* Modo de Color de Tinta */}
                          <div className="space-y-1.5">
                            <span className="text-[11px] text-slate-300 font-medium block">Tratamiento de Color de Tinta</span>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => handleReprocess(bgSensitivity, 'blue_ink')}
                                className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition ${
                                  inkMode === 'blue_ink'
                                    ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                                }`}
                              >
                                🖊️ Lápiz Pasta Azul
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReprocess(bgSensitivity, 'pure_black')}
                                className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition ${
                                  inkMode === 'pure_black'
                                    ? 'bg-slate-700 border-sky-400 text-white'
                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                                }`}
                              >
                                ⬛ Negro Legal Puro
                              </button>
                            </div>
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
