document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");

    if (!loginForm) return;

    loginForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const email = document.getElementById("account").value;

        if (email === "admin@gmail.com") {
            window.location.href = "homeowner-management.html";
        } else {
            window.location.href = "homeowner.html";
        }
    });
});


