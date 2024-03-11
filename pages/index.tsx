import axios from "axios";
import type { NextPage } from "next";
import Image from "next/image";
import React from "react";

const Home: NextPage = () => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedVideo, setSelectedVideo] = React.useState<string | null>(null);
  const [selectedCreatorImage, setSelectedCreatorImage] = React.useState<
    string | null
  >(null);
  const [selectedLogoImage, setSelectedLogoImage] = React.useState<
    string | null
  >(null);
  const [creatorName, setCreatorName] = React.useState("");
  const [bio, setBio] = React.useState("");

  const inputVideoFileRef = React.useRef<HTMLInputElement | null>(null);
  const creatorImageFileRef = React.useRef<HTMLInputElement | null>(null);
  const logoImageFileRef = React.useRef<HTMLInputElement | null>(null);

  const handleOnRunButtonClick = async (
    e: React.MouseEvent<HTMLInputElement>
  ) => {
    /* Prevent form from submitting by default */
    e.preventDefault();

    /* If file is not selected, then show alert message */
    if (
      !inputVideoFileRef.current?.files?.length ||
      !creatorImageFileRef.current?.files?.length ||
      !logoImageFileRef.current?.files?.length
    ) {
      return;
    }

    setIsLoading(true);

    /* Add files to FormData */
    const formData = new FormData();
    Object.values(inputVideoFileRef.current.files).forEach((file) => {
      formData.append("file", file);
    });
    Object.values(creatorImageFileRef.current.files).forEach((file) => {
      formData.append("file", file);
    });
    Object.values(logoImageFileRef.current.files).forEach((file) => {
      formData.append("file", file);
    });

    /* Send request to our api route */
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const body = (await response.json()) as {
      status: "ok" | "fail";
      message: string;
    };

    if (body.status === "ok") {
      const videoURL = URL.createObjectURL(inputVideoFileRef.current.files[0]);
      setSelectedVideo(videoURL);
      const creatorImageURL = URL.createObjectURL(
        creatorImageFileRef.current.files[0]
      );
      setSelectedCreatorImage(creatorImageURL);
      const logoImageURL = URL.createObjectURL(
        logoImageFileRef.current.files[0]
      );
      setSelectedLogoImage(logoImageURL);
      // Do some stuff on successfully upload

      const response = await axios.post(
        "/api/process",
        {
          bio: bio,
          creatorName: creatorName,
        },
        {
          timeout: 0, // Setting timeout to 0 disables it
        }
      );

      if (response.data.status == 200) {
        alert("success");
        try {
          const response = await fetch("/api/download");
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "edited_video.mp4";
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
        } catch (error) {
          console.error("Error downloading file:", error);
        }
      } else {
        alert("failed");
      }
    } else {
      // Do some stuff on error
      setSelectedVideo(null);
      setSelectedCreatorImage(null);
      setSelectedLogoImage(null);
    }

    inputVideoFileRef.current.value = "";
    creatorImageFileRef.current.value = "";
    logoImageFileRef.current.value = "";

    setIsLoading(false);
  };

  return (
    <form>
      <div>
        {selectedVideo != null && (
          <div>
            <h3>Selected Video:</h3>
            <video controls width="300">
              <source src={selectedVideo} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        )}
        <input
          type="file"
          name="myfile"
          accept="video/*"
          ref={inputVideoFileRef}
          disabled={isLoading}
        />
      </div>
      <div>
        {selectedCreatorImage != null && (
          <div>
            <h3>Selected Creator Image:</h3>
            <Image
              src={selectedCreatorImage}
              alt="Creator"
              width="50"
              height="50"
            />
          </div>
        )}
        <input
          type="file"
          name="myfile"
          disabled={isLoading}
          accept="image/*"
          ref={creatorImageFileRef}
        />
      </div>
      <div>
        {selectedLogoImage != null && (
          <div>
            <h3>Selected Logo Image:</h3>
            <Image src={selectedLogoImage} alt="Logo" width="200" height="50" />
          </div>
        )}
        <input
          type="file"
          name="myfile"
          disabled={isLoading}
          accept="image/*"
          ref={logoImageFileRef}
        />
      </div>
      <div>
        <div>
          <label>
            Creator Name:
            <input
              type="text"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              disabled={isLoading}
              maxLength={40}
            />
          </label>
        </div>
        <div>
          <label>
            Bio:
            <input
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={isLoading}
              maxLength={40}
            />
          </label>
        </div>
      </div>
      <div>
        <input
          type="submit"
          value="Upload"
          disabled={isLoading}
          onClick={handleOnRunButtonClick}
        />
        {isLoading && ` Wait, please...`}
      </div>
    </form>
  );
};

export default Home;
