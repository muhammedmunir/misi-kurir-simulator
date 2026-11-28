import { DELIVERY_ZONES } from "@/lib/delivery-system";
import { PlacementModels, batchPlacements } from "./PlacementModels";
import { blockPlacements } from "./city-blocks";
import { buildingLayout } from "./city-layout";

const addressCount = DELIVERY_ZONES.filter((zone) => zone.type === "delivery" && zone.lot).length;
const data = batchPlacements(blockPlacements(), buildingLayout().length + addressCount);

export function CityBlocks() {
  return <PlacementModels data={data} />;
}
