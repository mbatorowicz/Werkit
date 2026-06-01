import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CornerDownLeft,
  CornerUpRight,
  MapPin,
  RotateCcw,
} from "lucide-react";

export function ManeuverIcon({
  type,
  modifier,
  className = "h-5 w-5",
}: {
  type: string;
  modifier?: string;
  className?: string;
}) {
  if (type === "arrive") return <MapPin className={className} />;
  if (type === "depart") return <ArrowUp className={className} />;
  if (type === "roundabout" || type === "rotary" || type === "exit_roundabout")
    return <RotateCcw className={className} />;
  if (type === "uturn" || modifier === "uturn") return <RotateCcw className={className} />;
  if (modifier === "left" || modifier === "sharp_left") return <ArrowLeft className={className} />;
  if (modifier === "right" || modifier === "sharp_right")
    return <ArrowRight className={className} />;
  if (modifier === "slight_left") return <CornerDownLeft className={className} />;
  if (modifier === "slight_right") return <CornerUpRight className={className} />;
  return <ArrowUp className={className} />;
}
