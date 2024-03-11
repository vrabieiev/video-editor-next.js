import pathToFfmpeg from "ffmpeg-static";
import Jimp from "jimp";
import type { NextApiRequest, NextApiResponse } from "next";
import util from "util";
const fs = require("fs-extra");

const exec = util.promisify(require("child_process").exec);
const videoEncoder = "h264";
const inputFile = "editorspace/rawvideo.mp4";
const outputFile = "editorspace/edited_video.mp4";

const inputFolder = "editorspace/temp/raw-frames";
const outputFolder = "editorspace/temp/edited-frames";

const bioSliderTop = 1095;
const avatarSize = 138;
const avatarLeft = 45;
const avatarTop = 36;
const bubbleLeft = 31;
const bubbleTop = 23;
const nameLeft = 250;
const nameTop = 25;
const bio1Left = 250;
const bio1Top = 112;
const bio2Left = 250;
const bio2Top = 150;
const logoLeft = 73;
const logoTop = 21;
const logoSliderTop = 1355;
const logoWidth = 381;
const logoHeight = 119;
const bioSliderWidth = 844;
const logoSliderWidth = 564;

let currentProgress = 0;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const { bio, creatorName } = req.body;

    try {
      // Process the bio and creatorName as needed
      console.log("Received bio:", bio);
      console.log("Received creatorName:", creatorName);

      const biowords = bio.split(" ");
      let bio1 = "";
      let bio2 = "";
      biowords.forEach((bioword: string) => {
        if (bio1.length + bioword.length < 20) {
          bio1 += bioword + " ";
        } else {
          bio2 += bioword + " ";
        }
      });

      try {
        // Create temporary folders
        console.log("Initialize temp files");
        await fs.remove(outputFile);
        await fs.mkdir("editorspace/temp");
        await fs.mkdir(inputFolder);
        await fs.mkdir(outputFolder);

        // Decode MP4 video and resize it to width 1080 and height auto (to keep the aspect ratio)
        console.log("Decoding");
        await exec(
          `"${pathToFfmpeg}" -i ${inputFile} -vf scale=1080:-1 ${inputFolder}/%d.png`
        );

        // Edit each frame
        console.log("Rendering");
        const frames = fs.readdirSync(inputFolder);

        for (let frameCount = 1; frameCount <= frames.length; frameCount++) {
          // Check and log progress
          checkProgress(frameCount, frames.length);

          // Read the current frame
          let frame = await Jimp.read(`${inputFolder}/${frameCount}.png`);

          // Modify frame
          if (frameCount >= 30 && frameCount <= 120)
            frame = await modifyFrame(
              frame,
              frameCount,
              creatorName,
              bio1,
              bio2
            );

          // Save the frame
          await frame.writeAsync(`${outputFolder}/${frameCount}.png`);
        }

        // Encode video from PNG frames to MP4 (no audio)
        console.log("Encoding");
        await exec(
          `"${pathToFfmpeg}" -start_number 1 -i ${outputFolder}/%d.png -vcodec ${videoEncoder} -pix_fmt yuv420p editorspace/temp/no-audio.mp4`
        );

        // Copy audio from original video
        console.log("Adding audio");
        await exec(
          `"${pathToFfmpeg}" -i editorspace/temp/no-audio.mp4 -i ${inputFile} -c copy -map 0:v:0 -map 1:a:0? ${outputFile}`
        );

        // Remove temp folder
        console.log("Cleaning up");
        await fs.remove("editorspace/temp");
        await fs.remove("editorspace/rawvideo.mp4");
        await fs.remove("editorspace/creator.jpg");
        await fs.remove("editorspace/expeerly-logo.png");
      } catch (e) {
        console.log("An error occurred:", e);

        // Remove temp folder
        console.log("Cleaning up");
        await fs.remove("editorspace/temp");

        res.status(500).json({
          status: 500,
          message: "Failed to process video",
        });
      }
      res.status(200).json({ status: 200, message: "Success" });
    } catch (error) {
      console.error("Error processing bio and creatorName:", error);
      res.status(500).json({
        status: 500,
        message: "Failed to process bio and creatorName",
      });
    }
  } else {
    res.status(405).json({ status: 405, message: "Method Not Allowed" });
  }
}

/**
 * Edit frame
 * Add padding to change the aspect ratio to 9:16 (for IGTV)
 * Add watermark to frame corner
 * @param frame
 */
const modifyFrame = async (
  frame: Jimp,
  frameCount: number,
  creatorName: string,
  bio1: string,
  bio2: string
) => {
  var currentBioSliderLeft = 0;
  var currentLogoSliderLeft = 0;
  if (frameCount >= 30 && frameCount <= 40) {
    currentBioSliderLeft =
      ((frameCount - 30) * bioSliderWidth) / 10 - bioSliderWidth;
    currentLogoSliderLeft =
      ((frameCount - 30) * logoSliderWidth) / 10 - logoSliderWidth;
  } else if (frameCount >= 110 && frameCount <= 120) {
    currentBioSliderLeft = (-(frameCount - 110) * bioSliderWidth) / 10;
    currentLogoSliderLeft = (-(frameCount - 110) * logoSliderWidth) / 10;
  }

  // Creator Slider
  const bioSlider = await Jimp.read("editorspace/bioslider1080x1920.png");
  bioSlider.opacity(0.9);

  const bubble = await Jimp.read("editorspace/bubble1080x1920.png");
  bioSlider.composite(bubble, bubbleLeft, bubbleTop, {
    mode: Jimp.BLEND_SOURCE_OVER,
    opacityDest: 1,
    opacitySource: 1,
  });

  const creator = await Jimp.read("editorspace/creator.jpg");
  const mask = await Jimp.read("editorspace/mask.png");

  const circledAvatar = creator.mask(mask, 0, 0);
  circledAvatar.resize(
    avatarSize * (circledAvatar.bitmap.width / circledAvatar.bitmap.height),
    avatarSize
  );
  bioSlider.composite(circledAvatar, avatarLeft, avatarTop, {
    mode: Jimp.BLEND_SOURCE_OVER,
    opacityDest: 1,
    opacitySource: 1,
  });

  const nameFont = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
  bioSlider.print(nameFont, nameLeft, nameTop, creatorName);
  const bio1Font = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
  bioSlider.print(bio1Font, bio1Left, bio1Top, bio1);
  if (bio2.length > 0) {
    const bio2Font = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
    bioSlider.print(bio2Font, bio2Left, bio2Top, bio2);
  }

  // Render Bio Slider to Origianl Frame
  frame.composite(bioSlider, currentBioSliderLeft, bioSliderTop, {
    mode: Jimp.BLEND_SOURCE_OVER,
    opacityDest: 1,
    opacitySource: 1,
  });

  // Logo Slider
  const logoSlider = await Jimp.read("editorspace/logoslider1080x1920.png");
  logoSlider.opacity(0.9);

  const logo = await Jimp.read("editorspace/expeerly-logo.png");
  logo.resize(logoWidth, logoHeight);
  logoSlider.composite(logo, logoLeft, logoTop, {
    mode: Jimp.BLEND_SOURCE_OVER,
    opacityDest: 1,
    opacitySource: 1,
  });

  // Render Logo Slider to Origianl Frame
  frame.composite(logoSlider, currentLogoSliderLeft, logoSliderTop, {
    mode: Jimp.BLEND_SOURCE_OVER,
    opacityDest: 1,
    opacitySource: 1,
  });

  return frame;
};

/**
 * Calculate the processing progress based on the current frame number and the total number of frames
 * @param currentFrame
 * @param totalFrames
 */
const checkProgress = (currentFrame: number, totalFrames: number) => {
  const progress = (currentFrame / totalFrames) * 100;
  if (progress > currentProgress + 10) {
    const displayProgress = Math.floor(progress);
    console.log(`Progress: ${displayProgress}%`);
    currentProgress = displayProgress;
  }
};
