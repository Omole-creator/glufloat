/**
 * Every soup is shown with "Soup" at the end of its name (founder, 2026-10-12),
 * so nobody reads "Ewedu" or "Ofe Owerri" and wonders what it is. Done here,
 * in the display layer, and NOT by renaming the food in data/foods.json: saved
 * meals are matched back to their food by the stored name (calories eaten
 * today, the doctor's report, food counts), so a rename would orphan every meal
 * already saved. Soups whose name already says "Soup" are left alone.
 * lib/search.ts also matches these shown names, so typing what is on screen
 * ("ewedu soup") finds the card.
 */
export const SOUP_DISPLAY: Record<string, string> = {
  "Efo Riro": "Efo Riro Soup",
  "Edikang Ikong": "Edikang Ikong Soup",
  Ewedu: "Ewedu Soup",
  "Gbegiri (beans soup)": "Gbegiri Soup (beans)",
  "Miyan Kuka (baobab leaf)": "Miyan Kuka Soup (baobab leaf)",
  "Miyan Taushe (pumpkin soup)": "Miyan Taushe Soup (pumpkin)",
  "Ofe Owerri": "Ofe Owerri Soup",
  "Ofe Akwu (palm fruit sauce)": "Ofe Akwu Soup (palm fruit)",
  "Miyan Kubewa (okra soup, northern)": "Miyan Kubewa Soup (northern okra)",
  "Miyan Yakuwa (sorrel leaf soup)": "Miyan Yakuwa Soup (sorrel leaf)",
};
