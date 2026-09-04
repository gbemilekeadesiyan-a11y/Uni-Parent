const page = document.body.dataset.page;
const modules = {
  today: "./pages/today.js",
  profile: "./pages/profile.js",
  schedule: "./pages/schedule.js",
};

if (modules[page]) {
  import(modules[page]).catch(() => {
    const toast = document.querySelector("#toast");
    if (toast) {
      toast.textContent = "This page could not finish loading. Refresh and try again.";
      toast.hidden = false;
    }
  });
}
