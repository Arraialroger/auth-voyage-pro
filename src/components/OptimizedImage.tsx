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
  // Se webpSrc não for fornecido, tenta gerar automaticamente
  const autoWebpSrc = webpSrc || src.replace(/\.(png|jpg|jpeg)$/i, '.webp');
  
  // Verifica se existe versão WebP (baseado na convenção de nomenclatura)
  const hasWebp = webpSrc || src.match(/\.(png|jpg|jpeg)$/i);

  if (!hasWebp) {
    // Se não tiver versão WebP, usa imagem normal
    return <img src={src} alt={alt} className={className} {...props} />;
  }

  return (
    <picture>
      <source srcSet={autoWebpSrc} type="image/webp" />
      <img src={src} alt={alt} className={className} {...props} />
    </picture>
  );
}
