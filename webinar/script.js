// Register button
function registerWebinar() {
    alert("Thank you for your interest in the SARMAK Webinar!");

    // Later you can replace this with your registration/payment page
    // window.location.href = "/register";
}


// Button click
const registerButton = document.querySelector("button");

if (registerButton) {
    registerButton.addEventListener("click", registerWebinar);
}


// Smooth page loading
document.addEventListener("DOMContentLoaded", function () {
    console.log("SARMAK Webinar page loaded successfully.");
});