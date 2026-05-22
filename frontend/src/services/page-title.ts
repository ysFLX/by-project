const defaultPageTitle = "Maharet Yemek";

export function setPageTitle(title?: string | null) {
  const normalizedTitle = title?.trim();
  document.title = normalizedTitle || defaultPageTitle;
}
