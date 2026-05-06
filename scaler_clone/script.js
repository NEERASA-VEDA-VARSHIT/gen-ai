const tagItems = document.querySelectorAll(".program-tags span");

tagItems.forEach((item) => {
  item.addEventListener("mouseenter", () => {
    item.style.borderColor = "#1264e0";
    item.style.color = "#1264e0";
  });

  item.addEventListener("mouseleave", () => {
    item.style.borderColor = "#ccd7ec";
    item.style.color = "#1b2740";
  });
});