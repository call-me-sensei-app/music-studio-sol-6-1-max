/** Positive-X hinging lowers the exposed +Z key nose. A small downward bed
 * translation also prevents the short portion behind the hinge from lifting.
 * Dimensions are authored before the room's 0.75 scale: about 10mm front dip.
 */
export function applyKeyAction(key){
  const travel=Math.max(0,Math.min(1,key.state.travel));
  key.pivot.position.y=key.restY-travel*.0013;
  key.pivot.rotation.x=travel*(key.isBlack?.073:.0405);
}
