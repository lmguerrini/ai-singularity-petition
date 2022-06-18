(function drawSignatureCanvas() {
    const canvas = document.querySelector("canvas");
    const clearCanvas = document.getElementById("clearCanvas");
    let hiddenInput = document.getElementById("signature");
    let dataURL;

    const ctx = canvas.getContext("2d");
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "white";

    let lastPosX = 0;
    let lastPosY = 0;
    let currPosX = 0;
    let currPosY = 0;
    let drawing = false;

    canvas.addEventListener("mousedown", (e) => {
        drawing = true;
        [lastPosX, lastPosY] = [e.offsetX, e.offsetY];
    });

    canvas.addEventListener("mousemove", (e) => {
        if (drawing) {
            [currPosX, currPosY] = [e.offsetX, e.offsetY];
            ctx.beginPath();
            ctx.moveTo(lastPosX, lastPosY);
            ctx.lineTo(currPosX, currPosY);
            ctx.stroke();
            [lastPosX, lastPosY] = [e.offsetX, e.offsetY];
            e.preventDefault();
        } else {
            return;
        }
    });

    canvas.addEventListener("mouseup", () => {
        drawing = false;
        dataURL = canvas.toDataURL();
        hiddenInput.value = dataURL;
    });

    // touchscreen
    canvas.addEventListener("touchstart", (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent("mousedown", {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas[0].dispatchEvent(mouseEvent);

        canvas.addEventListener("touchmove", (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent("mousemove", {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            canvas[0].dispatchEvent(mouseEvent);
        });

        canvas.addEventListener("touchend", () => {
            e.preventDefault();
            const mouseEvent = new MouseEvent("mouseup", {});
            canvas[0].dispatchEvent(mouseEvent);
            dataURL = canvas.toDataURL();
            hiddenInput.value = dataURL;
        });
    });

    clearCanvas.addEventListener("click", () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
})();
