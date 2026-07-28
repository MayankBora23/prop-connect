import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/aileadx-logo.png";

type BrandLogoProps = {
  /** header / footer / banner size variant */
  variant?: "header" | "footer" | "banner";
  className?: string;
  linkToHome?: boolean;
};

const sizeClasses = {
  header: "h-11 sm:h-12 lg:h-14 w-auto max-w-[min(100%,380px)]",
  footer: "h-12 sm:h-14 w-auto max-w-[min(100%,400px)]",
  banner: "h-16 sm:h-20 md:h-24 w-auto max-w-[min(100%,480px)]",
};

export function BrandLogo({ variant = "header", className, linkToHome = true }: BrandLogoProps) {
  const img = (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-xl overflow-hidden shadow-md ring-1 ring-black/10 dark:ring-white/10",
        className
      )}
    >
      <img
        src={LOGO_SRC}
        alt="AiLeadX — Smart CRM. Smarter Growth."
        className={cn("object-contain object-left", sizeClasses[variant])}
        width={360}
        height={90}
        loading="eager"
        decoding="async"
      />
    </span>
  );

  if (linkToHome) {
    return (
      <Link
        to="/"
        className="group inline-flex shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
      >
        {img}
      </Link>
    );
  }

  return img;
}
