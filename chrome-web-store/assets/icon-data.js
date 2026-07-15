window.ICON_DATA_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAIAAABMXPacAAADjElEQVR4nO2c3XWjMBBGbZ8twS3sNpaU5crcwm4P7INzEoIESKMZfSLc+5g4+vkuI7CAXKdpujTz5/1feyOH4/m4tzdyNQs4Z+hrmGVYBBD9GgYNdQKIvoQqDaUCiL6WQg23kg+RvoHC0PYFkL6Zkui2liCi92JjOVqtANJ3ZCPMvADSd2ct0qKTMMSREcDhH0Q22KUA0g8ljfe2/WtwZxEy5wAxXwI4/Lsxj5oKEPMhgMO/M5+BUwFibhcOfxGv2KkAMQgQgwAx199vf9VjODVUgBgEiEGAGASIQYAYBIhBgBgEiEGAGASIQYAYBIhBgBgEiEGAGASIQYAYBIj5pR5AKYZXcA/xuM2I94Rd/gXAGqNZGUVAaOhrjCBDLECSe4rQhEbAILmn9DfRW4A5ekM0Pfsy009AeRwl88+2Zv5D8zDa6SGgZM6Fsy2Mz7G1aA2xAnZnWD690O8BjuOsJVDAxqxq59NtNXcccyFRAtZm4pVIth1Jp42ECDCfIXfbMS/uXhdR7g78N+Pixl3eSFx37t9gnCvA5dDLNtV+CHuNpKWpFE8BndP3+oxhPC1NLXBbguKGmLbzfNzT7rI/DB2DS8tRN2RaZj6fW+3Mtx20pBZ0GeojwKvSazsyf8bGYl4uHR3plmT5hIfdbU1xEOA72+31x4bXKpTS3pp/BQStP7VTDSqCA3wRgyoQIAYBYhAgptNmXDu1Z79BrgV2cRDgO9WIS8aIS1uv1o60BHXeju6Dj4CI7+glHZk/YyNixyWqAry2vWo3OLc377y2CB1xExC3YZt1kHaX/WHoGFxa5o5YdTstTaX435R3vCfckqBL+h3uy3fajHNZCjpvR/d5KoLnglo7bYQn40o7OtiTcS94NnQXno72acoM7wc0DaMd3pDx6csM74h94+e/I7ZgEBOne0syhfeEB4I35UeE/xUBIRzpluSPBAFiECAGAWIQIAYBYhAgBgFiECAGAWIQIAYBYhAgBgFiECAGAWIQIOY2yHMJ5+T5uFMBYhAgBgFibpdhHk87G6/YqQAxHwIogs58Bk4FiPkSQBF0Yx41FSDmmwCKoAOLkJcVgINQ0ngzSxAOgsgGyzlATF4AReDOWqSrFYADRzbCvE7TtP3Hh3jRZ1h2j+P9cwClYKYkuqKTMA4MFIa2vwTNYTkqoep4rRPwAg1rGJYKi4AXaJhjXqXtAuacU4bLqfE/owHxcrBRn6wAAAAASUVORK5CYII=";
(function () {
  function apply() {
    if (!window.ICON_DATA_URL) return;
    document.querySelectorAll("img[data-store-icon]").forEach(function (img) {
      img.crossOrigin = "anonymous";
      img.src = window.ICON_DATA_URL;
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply);
  else apply();
})();
