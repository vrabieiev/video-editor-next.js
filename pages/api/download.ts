import fs from "fs";
import { NextApiRequest, NextApiResponse } from "next";
import path from "path";

const downloadHandler = (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // Set the path to the edited video file
    const filePath = path.join(
      process.cwd(),
      "editorspace",
      "edited_video.mp4"
    );

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({ status: "fail", message: "File not found" });
    }

    // Set the appropriate headers for the response
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=edited_video.mp4`
    );
    res.setHeader("Content-Type", "video/mp4");

    // Stream the file to the response
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).json({ status: "fail", message: "Internal server error" });
  }
};

export default downloadHandler;
