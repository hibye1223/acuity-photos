"use client";

import {
  Check,
  Copy,
  Mail,
  MessageSquare,
  RefreshCw,
  Share2,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  disableAlbumShareAction,
  enableAlbumShareAction,
  regenerateAlbumShareLinkAction,
} from "~/app/actions/albums";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Switch } from "~/components/ui/switch";
import { env } from "~/env";

export function ShareAlbumDialog({
  albumId,
  title,
  initialShareEnabled,
  initialShareToken,
}: {
  albumId: string;
  title: string;
  initialShareEnabled: boolean;
  initialShareToken: string | null;
}) {
  const [shareEnabled, setShareEnabled] = useState(initialShareEnabled);
  const [shareToken, setShareToken] = useState(initialShareToken);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  const shareUrl =
    shareEnabled && shareToken
      ? `${env.NEXT_PUBLIC_SITE_URL}/share/${shareToken}`
      : null;

  useEffect(() => {
    if (!shareUrl) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    import("qrcode").then(async (QRCode) => {
      const dataUrl = await QRCode.toDataURL(shareUrl, {
        margin: 1,
        width: 200,
      });
      if (!cancelled) setQrDataUrl(dataUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [shareUrl]);

  async function handleToggle(next: boolean) {
    setIsUpdating(true);
    setError(null);
    try {
      const result = next
        ? await enableAlbumShareAction(albumId)
        : await disableAlbumShareAction(albumId);
      setShareEnabled(result.shareEnabled);
      setShareToken(result.shareToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleRegenerate() {
    setIsUpdating(true);
    setError(null);
    try {
      const result = await regenerateAlbumShareLinkAction(albumId);
      setShareEnabled(result.shareEnabled);
      setShareToken(result.shareToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleNativeShare() {
    if (!shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
      } catch {
        // User dismissed the share sheet — nothing to do.
      }
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Share</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share "{title}"</DialogTitle>
          <DialogDescription>
            Anyone with the link can view this album. It never shows up in
            search engines.
          </DialogDescription>
        </DialogHeader>

        <Switch
          label="Public link"
          description={shareEnabled ? "Sharing is on." : "Sharing is off."}
          checked={shareEnabled}
          onCheckedChange={handleToggle}
          disabled={isUpdating}
        />

        {shareEnabled && shareUrl && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                onFocus={(event) => event.currentTarget.select()}
                className="h-9 flex-1 truncate rounded-md border bg-muted/30 px-3 text-sm text-foreground"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopy}
                aria-label="Copy link"
              >
                {copied ? <Check className="text-primary" /> : <Copy />}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {canNativeShare && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleNativeShare}
                >
                  <Share2 /> Share...
                </Button>
              )}
              <Button type="button" variant="secondary" size="sm" asChild>
                <a
                  href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(shareUrl)}`}
                >
                  <Mail /> Email
                </a>
              </Button>
              <Button type="button" variant="secondary" size="sm" asChild>
                <a
                  href={`sms:?&body=${encodeURIComponent(`${title}: ${shareUrl}`)}`}
                >
                  <MessageSquare /> Text
                </a>
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isUpdating}
                  >
                    <RefreshCw /> New link
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent size="sm">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Generate a new link?</AlertDialogTitle>
                    <AlertDialogDescription>
                      The old link stops working immediately — anyone still
                      using it will lose access.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRegenerate}>
                      Generate new link
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {qrDataUrl && (
              // biome-ignore lint/performance/noImgElement: a generated data: URL, not an optimizable remote image
              <img
                src={qrDataUrl}
                alt="QR code linking to the shared album"
                className="size-32 self-start rounded-md border border-border"
              />
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
