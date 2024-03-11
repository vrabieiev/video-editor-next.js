import formidable, { File } from "formidable";
import {
  createReadStream,
  createWriteStream,
  promises as fs,
  unlinkSync,
} from "fs";
import type { NextApiRequest, NextApiResponse } from "next";
import path from "path";

export const config = {
  api: {
    bodyParser: false,
  },
};

type ProcessedFiles = Array<[string, File]>;

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  let status = 200,
    resultBody = { status: "ok", message: "Files were uploaded successfully" };

  /* Get files using formidable */
  const files = await new Promise<ProcessedFiles | undefined>(
    (resolve, reject) => {
      const form = new formidable.IncomingForm();
      const files: ProcessedFiles = [];
      form.on("file", function (field, file) {
        files.push([field, file]);
      });
      form.on("end", () => resolve(files));
      form.on("error", (err) => reject(err));
      form.parse(req, () => {
        //
      });
    }
  ).catch((e) => {
    console.log(e);
    status = 500;
    resultBody = {
      status: "fail",
      message: "Upload error",
    };
  });

  if (files?.length) {
    /* Create directory for uploads */
    const targetPath = path.join(process.cwd(), `/editorspace/`);
    try {
      await fs.access(targetPath);
    } catch (e) {
      await fs.mkdir(targetPath);
    }

    /* Move uploaded files to directory */
    for (const file of files) {
      const tempPath = file[1].filepath;
      const originalFilename = file[1].originalFilename ?? "";
      const filePath = path.join(targetPath, originalFilename);

      const readStream = createReadStream(tempPath);
      const writeStream = createWriteStream(filePath);

      readStream.pipe(writeStream);

      writeStream.on("finish", () => {
        unlinkSync(tempPath); // Remove temporary file
      });

      writeStream.on("error", (error) => {
        console.error("Error writing file:", error);
      });
    }
  }

  res.status(status).json(resultBody);
};

export default handler;
