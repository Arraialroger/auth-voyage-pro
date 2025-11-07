import { ImgHTMLAttributes } from 'react';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  webpSrc?: string;
}

/**
 * Componente de imagem otimizado com suporte a WebP e fallback PNG
 * Usa <picture> para servir WebP quando disponível, com fallback para PNG
 */
export function OptimizedImage({ src, webpSrc, alt, className, ...props }: OptimizedImageProps) {
  // Para evitar imagens quebradas: só usa <picture> se webpSrc for EXPLÍCITO
  // Caso contrário, renderiza <img> normal com o PNG/JPEG fornecido
  if (webpSrc) {
    return (
      <picture>
        <source srcSet={webpSrc} type="image/webp" />
        <img src={src} alt={alt} className={className} {...props} />
      </picture>
    );
  }

  return <img src={src} alt={alt} className={className} {...props} />;
}
