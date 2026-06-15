import { Twitter, Linkedin, Facebook, Link2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';

export const SocialShareButtons = ({ certificateId, courseTitle, userName }) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/certificate/${certificateId}`;
  
  const twitterText = `¡Acabo de completar el curso "${courseTitle}" en Cursos! 🎓 #Aprendizaje #Educación`;
  const linkedinText = `Orgulloso de haber completado el curso: ${courseTitle}`;

  const shareOnTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const shareOnLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=600');
  };

  const shareOnFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Enlace copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Error al copiar enlace');
    }
  };

  return (
    <div className="flex flex-wrap gap-3" data-testid="social-share-buttons">
      <Button
        onClick={shareOnTwitter}
        variant="outline"
        size="sm"
        className="bg-[#1DA1F2]/10 border-[#1DA1F2]/20 text-[#1DA1F2] hover:bg-[#1DA1F2]/20"
        data-testid="share-twitter"
      >
        <Twitter className="h-4 w-4 mr-2" />
        Twitter
      </Button>
      
      <Button
        onClick={shareOnLinkedIn}
        variant="outline"
        size="sm"
        className="bg-[#0A66C2]/10 border-[#0A66C2]/20 text-[#0A66C2] hover:bg-[#0A66C2]/20"
        data-testid="share-linkedin"
      >
        <Linkedin className="h-4 w-4 mr-2" />
        LinkedIn
      </Button>
      
      <Button
        onClick={shareOnFacebook}
        variant="outline"
        size="sm"
        className="bg-[#1877F2]/10 border-[#1877F2]/20 text-[#1877F2] hover:bg-[#1877F2]/20"
        data-testid="share-facebook"
      >
        <Facebook className="h-4 w-4 mr-2" />
        Facebook
      </Button>
      
      <Button
        onClick={copyLink}
        variant="outline"
        size="sm"
        className="bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700"
        data-testid="copy-link"
      >
        {copied ? (
          <Check className="h-4 w-4 mr-2" />
        ) : (
          <Link2 className="h-4 w-4 mr-2" />
        )}
        {copied ? 'Copiado' : 'Copiar enlace'}
      </Button>
    </div>
  );
};