// import File from '../models/file.model.js';
import File from '../models/file.models.js';
import User from '../models/user.models.js';
import { GuestFile } from '../models/guestFile.models.js';
import path from 'path';
import shortid from 'shortid';
import QRCode from 'qrcode';
import supabase from '../config/supabase.js';
import bcrypt from 'bcryptjs';
import dotenv from "dotenv"
dotenv.config();

const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET ;
console.log(`supabase bucket : ${SUPABASE_BUCKET}`)

// Helper to create a signed URL for a file in Supabase Storage
const createSignedUrl = async (filePath, expiresSec = 3600) => {
  const { data, error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .createSignedUrl(filePath, expiresSec);
  if (error) throw error;
  return data.signedUrl;
};

const uploadFiles = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const { isPassword, password, hasExpiry, expiresAt, userId } = req.body;

  try {
    const savedFiles = [];
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    for (const file of req.files) {
        const originalName = file.originalname; // e.g., "M.Sc.-II_ComputerApplications.pdf"
      const extension = path.extname(originalName); // ".pdf"
      const baseName = path.basename(originalName, extension); // "M.Sc.-II_ComputerApplications"
      const uniqueSuffix = shortid.generate(); // "NI_5tMh7o"
      const finalFileName = `${baseName}_${uniqueSuffix}${extension}`;
      // Result: "M.Sc.-II_ComputerApplications_NI_5tMh7o.pdf"
      const storagePath = finalFileName;

      console.log("storagePath: ", storagePath);

      // Compute expiry for DB and for signed url
      const expiresAtDate = hasExpiry === 'true'
        ? new Date(Date.now() + Number(expiresAt) * 3600000)
        : new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // default 10 days

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(SUPABASE_BUCKET || "pastebox-files")
        .upload(storagePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });
      if (uploadError) {
        console.error('Supabase upload error:', uploadError.message);
        continue;
      }

      // Generate public URL for download
     const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(storagePath);
      const publicURL = data.publicUrl;

      const shortCode = shortid.generate();

      const fileObj = {
        path: publicURL,
        name: finalFileName,
        type: file.mimetype,
        size: file.size,
        hasExpiry: hasExpiry === 'true',
        expiresAt: expiresAtDate,
        status: 'active',
        shortUrl: `/f/${shortCode}`,
        createdBy: userId,
      };

      console.log("file obj : " , fileObj);

      if (isPassword === 'true' && password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        fileObj.password = hashedPassword;
        fileObj.isPasswordProtected = true;
      }

      const newFile = new File(fileObj);
      const savedFile = await newFile.save();
      savedFiles.push(savedFile);

      // Update user stats safely
      user.totalUploads = (user.totalUploads || 0) + 1;
      if (file.mimetype.startsWith('image/')) user.imageCount = (user.imageCount || 0) + 1;
      else if (file.mimetype.startsWith('video/')) user.videoCount = (user.videoCount || 0) + 1;
      else if (file.mimetype.startsWith('application/')) user.documentCount = (user.documentCount || 0) + 1;
    }

    await user.save();

    return res.status(201).json({
      message: 'Files uploaded successfully',
      fileIds: savedFiles.map(f => f._id),
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ message: 'File upload failed' });
  }
};

const uploadFilesGuest = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }


  const { isPassword, password, hasExpiry, expiresAt } = req.body;

  try {
    const savedFiles = [];

    for (const file of req.files) {
      const originalName = file.originalname; // e.g., "M.Sc.-II_ComputerApplications.pdf"
      const extension = path.extname(originalName); // ".pdf"
      const baseName = path.basename(originalName, extension); // "M.Sc.-II_ComputerApplications"
      const uniqueSuffix = shortid.generate(); // "NI_5tMh7o"
      const finalFileName = `${baseName}_${uniqueSuffix}${extension}`;
      // Result: "M.Sc.-II_ComputerApplications_NI_5tMh7o.pdf"
      const storagePath = finalFileName;

      console.log("storagePath: ", storagePath);

      const expiresAtDate = hasExpiry === 'true'
        ? new Date(Date.now() + Number(expiresAt) * 3600000)
        : new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

      const { error: uploadError } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(storagePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });
      if (uploadError) {
        console.error('Supabase upload error:', uploadError.message);
        continue;
      }

      console.log("Public URL: ", supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(storagePath));
      const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(storagePath);
      const publicURL = data.publicUrl;

      console.log("Public URL:", publicURL);

      if (!publicURL) {
        console.error('Supabase publicURL error: publicURL is undefined');
        continue;
      }

      const shortCode = shortid.generate();
      const username = shortid.generate();

      const fileObj = {
        path: publicURL,
        publicURL: publicURL,
        name: finalFileName,
        type: file.mimetype,
        size: file.size,
        hasExpiry: hasExpiry === 'true',
        expiresAt: expiresAtDate,
        status: 'active',
        shortUrl: `/g/${shortCode}`,
        createdBy: `guest_${username}`,

      };

      if (isPassword === 'true' && password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        fileObj.password = hashedPassword;
        fileObj.isPasswordProtected = true;
      }

      try {
        const newFile = new GuestFile(fileObj);
        const savedFile = await newFile.save();
        savedFiles.push(savedFile);
      } catch (dbError) {
        console.error('GuestFile save error:', dbError);
        continue;
      }
    }

    if (savedFiles.length === 0) {
      return res.status(500).json({ message: 'No files were saved. Check file types and storage.' });
    }

    return res.status(201).json({
      message: 'Files uploaded successfully',
      files: savedFiles.map(f => ({
        id: f._id,
        name: f.name,
        size: f.size,
        type: f.type,
        path: f.path,
        isPasswordProtected: f.isPasswordProtected,
        expiresAt: f.expiresAt,
        downloadedContent: f.downloadedContent,
        status: f.status,
        shortUrl: f.shortUrl,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ message: 'File upload failed' });
  }
};

const downloadInfo = async (req, res) => {
  const { shortCode } = req.params;

  try {
    const file = await File.findOne({ shortUrl: `/f/${shortCode}` });
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (file.status !== 'active') return res.status(403).json({ error: 'This file is not available for download' });
    if (file.expiresAt && new Date(file.expiresAt) < new Date()) return res.status(410).json({ error: 'This file has expired' });

    // Generate signed URL for download (1 hour expiry)
    const signedUrl = await createSignedUrl(file.name, 3600);

    file.downloadedContent = (file.downloadedContent || 0) + 1;
    await file.save();

    // Update user download count
    const user = await User.findById(file.createdBy);
    if (user) {
      user.totalDownloads = (user.totalDownloads || 0) + 1;
      await user.save();
    }

    return res.status(200).json({
      downloadUrl: signedUrl,
      id: file._id,
      name: file.name,
      size: file.size,
      type: file.type || 'file',
      path: file.path,
      isPasswordProtected: file.isPasswordProtected || false,
      expiresAt: file.expiresAt || null,
      status: file.status || 'active',
      shortUrl: file.shortUrl,
      downloadedContent: file.downloadedContent,
      uploadedBy: user?.fullname || 'Unknown',
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    });
  } catch (error) {
    console.error('Download error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

const guestDownloadInfo = async (req, res) => {
  const { shortCode } = req.params;

  try {
    const file = await GuestFile.findOne({ shortUrl: `/g/${shortCode}` });
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (file.status !== 'active') return res.status(403).json({ error: 'This file is not available for download' });
    if (file.expiresAt && new Date(file.expiresAt) < new Date()) return res.status(410).json({ error: 'This file has expired' });

    const signedUrl = await createSignedUrl(file.name, 3600);

    file.downloadedContent = (file.downloadedContent || 0) + 1;
    await file.save();

    return res.status(200).json({
      downloadUrl: signedUrl,
      id: file._id,
      name: file.name,
      size: file.size,
      type: file.type || 'file',
      path: file.path,
      isPasswordProtected: file.isPasswordProtected || false,
      expiresAt: file.expiresAt || null,
      status: file.status || 'active',
      shortUrl: file.shortUrl,
      downloadedContent: file.downloadedContent,
      uploadedBy: file.createdBy,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    });
  } catch (error) {
    console.error('Download error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

const downloadFile = async (req, res) => {
  const { fileId } = req.params;
  const { password } = req.body;

  try {
    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (file.status !== 'active') return res.status(403).json({ error: 'This file is not available for download' });
    if (file.expiresAt && new Date(file.expiresAt) < new Date()) return res.status(410).json({ error: 'This file has expired' });

    if (file.isPasswordProtected) {
      if (!password) return res.status(401).json({ error: 'Password required' });
      const isMatch = await bcrypt.compare(password, file.password);
      if (!isMatch) return res.status(403).json({ error: 'Incorrect password' });
    }

    const signedUrl = await createSignedUrl(file.name, 3600);

    file.downloadedContent = (file.downloadedContent || 0) + 1;
    await file.save();

    // Update user download count
    const user = await User.findById(file.createdBy);
    if (user) {
      user.totalDownloads = (user.totalDownloads || 0) + 1;
      await user.save();
    }

    return res.status(200).json({ downloadUrl: signedUrl });
  } catch (error) {
    console.error('Download error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

const deleteFile = async (req, res) => {
  const { fileId } = req.params;

  try {
    let file = await File.findById(fileId);
    let isGuest = false;
    if (!file) {
      file = await GuestFile.findById(fileId);
      isGuest = true;
    }

    if (!file) return res.status(404).json({ error: 'File not found' });
    if (file.status === 'deleted') return res.status(400).json({ error: 'File already deleted' });

    // Delete file from Supabase Storage
    const { error: deleteError } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .remove([file.name]);
    if (deleteError) {
      console.error('Supabase delete error:', deleteError.message);
      return res.status(500).json({ error: 'Error deleting file from storage' });
    }

    if (isGuest) {
      await GuestFile.deleteOne({ _id: fileId });
    } else {
      await File.deleteOne({ _id: fileId });
    }

    return res.status(200).json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

const updateFileStatus = async (req, res) => {
  const { fileId } = req.params;
  const { status } = req.body;

  try {
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (file.status === status) return res.status(400).json({ error: 'File already has this status' });

    file.status = status;
    await file.save();

    return res.status(200).json({ message: 'File status updated successfully' });
  } catch (error) {
    console.error('Update error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

const updateFileExpiry = async (req, res) => {
  const { fileId } = req.params;
  const { expiresAt } = req.body;

  try {
    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ error: 'File not found' });

    if (expiresAt) {
      file.expiresAt = new Date(Date.now() + Number(expiresAt) * 3600000);
      file.hasExpiry = true;
    }

    await file.save();

    return res.status(200).json({ message: 'File expiry updated successfully' });
  } catch (error) {
    console.error('Update error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

const updateAllFileExpiry = async (req, res) => {
  try {
    const files = await File.find();

    if (!files || files.length === 0) return res.status(404).json({ error: 'No files found' });

    const updatedFiles = [];
    for (const file of files) {
      if (file.status === 'deleted') continue;
      if (file.expiresAt && new Date(file.expiresAt) < new Date()) {
        file.status = 'expired';
        file.hasExpiry = true;
      } else {
        file.expiresAt = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 days
        file.hasExpiry = true;
      }
      await file.save();
      updatedFiles.push(file);
    }

    return res.status(200).json({ message: 'All file expiries updated successfully', files: updatedFiles });
  } catch (error) {
    console.error('Update all expiry error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

const updateFilePassword = async (req, res) => {
  const { fileId } = req.params;
  const { newPassword } = req.body;

  try {
    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (!newPassword) return res.status(400).json({ error: 'New password is required' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    file.password = hashedPassword;
    file.isPasswordProtected = true;
    await file.save();

    return res.status(200).json({ message: 'File password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    return res.status(500).json({ error: 'Error updating file password' });
  }
};

const searchFiles = async (req, res) => {
  const { query } = req.query;

  try {
    const files = await File.find({ name: { $regex: query, $options: 'i' } });
    if (!files.length) return res.status(404).json({ message: 'No files found' });
    return res.status(200).json(files);
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ error: 'Error searching files' });
  }
};

const showUserFiles = async (req, res) => {
  const { userId } = req.params;

  try {
    const files = await File.find({ createdBy: userId });
    if (!files.length) return res.status(404).json({ message: 'No files found' });
    return res.status(200).json(files);
  } catch (error) {
    console.error('List files error:', error);
    return res.status(500).json({ error: 'Error fetching user files' });
  }
};

const getFileDetails = async (req, res) => {
  const { fileId } = req.params;

  try {
    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ message: 'File not found' });
    return res.status(200).json(file);
  } catch (error) {
    console.error('Get file details error:', error);
    return res.status(500).json({ error: 'Error fetching file details' });
  }
};

const generateShareShortenLink = async (req, res) => {
  const { fileId } = req.body;
  try {
    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ error: 'File not found' });

    const shortCode = shortid.generate();
    file.shortUrl = `${process.env.BASE_URL}/f/${shortCode}`;
    await file.save();

    res.status(200).json({ shortUrl: file.shortUrl });
  } catch (error) {
    console.error('Shorten link error:', error);
    res.status(500).json({ error: 'Error generating short link' });
  }
};

const sendLinkEmail = async (req, res) => {
  const { fileId, email } = req.body;
  try {
    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ error: 'File not found' });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"File Share App" <${process.env.MAIL_USER}>`,
      to: email,
      subject: 'Your Shared File Link',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>📎 You've received a file!</h2>
          <p>Hello,</p>
          <p>You have been sent a file using <strong>File Share App</strong>.</p>
          <p><strong>File Name:</strong> ${file.name}</p>
          <p><strong>File Type:</strong> ${file.type}</p>
          <p><strong>Size:</strong> ${(file.size / 1024).toFixed(2)} KB</p>
          <p><strong>Download Link:</strong></p>
          <p><a href="${file.path}" target="_blank" style="color: #3366cc;">Click here to download your file</a></p>
          ${file.expiresAt ? `<p><strong>Note:</strong> This link will expire on <strong>${new Date(file.expiresAt).toLocaleString()}</strong>.</p>` : ''}
          <p>Thank you for using File Share App!</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Link sent successfully' });
  } catch (error) {
    console.error('Resend link error:', error);
    res.status(500).json({ error: 'Error resending link' });
  }
};

const generateQR = async (req, res) => {
  const { fileId } = req.params;

  try {
    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ error: 'File not found' });

    const fileUrl = file.path;
    const qrDataUrl = await QRCode.toDataURL(fileUrl);

    res.status(200).json({ qr: qrDataUrl });
  } catch (error) {
    console.error('QR generation error:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
};

const getDownloadCount = async (req, res) => {
  const { fileId } = req.params;
  try {
    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ error: 'File not found' });
    res.status(200).json({ downloadCount: file.downloadedContent || 0 });
  } catch (error) {
    console.error('Get download count error:', error);
    res.status(500).json({ error: 'Failed to get download count' });
  }
};

const resolveShareLink = async (req, res) => {
  const { code } = req.params;
  try {
    const shortUrl = `${process.env.BASE_URL}/f/${code}`;
    const file = await File.findOne({ shortUrl });

    if (!file) return res.status(404).json({ error: 'Invalid or expired link' });

    if (file.expiresAt && new Date() > file.expiresAt) {
      file.status = 'expired';
      await file.save();
      return res.status(410).json({ error: 'This file has expired.' });
    }

    return res.status(200).json({
      fileId: file._id,
      name: file.name,
      size: file.size,
      type: file.type || 'file',
      previewUrl: file.path,
      isPasswordProtected: file.isPasswordProtected || false,
      expiresAt: file.expiresAt || null,
      status: file.status || 'active',
    });
  } catch (error) {
    console.error('Error resolving share link:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const verifyFilePassword = async (req, res) => {
  const { shortCode, password } = req.body;
  try {
    const file = await File.findOne({ shortUrl: `/f/${shortCode}` });
    if (!file || !file.isPasswordProtected) return res.status(400).json({ success: false, error: 'File not protected or not found' });

    const isMatch = await bcrypt.compare(password, file.password);
    if (!isMatch) return res.status(401).json({ success: false, error: 'Incorrect password' });

    return res.status(200).json({ success: true, message: 'Password verified' });
  } catch (error) {
    console.error('Password verification error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

const verifyGuestFilePassword = async (req, res) => {
  const { shortCode, password } = req.body;
  try {
    const file = await GuestFile.findOne({ shortUrl: `/g/${shortCode}` });
    if (!file || !file.isPasswordProtected) return res.status(400).json({ success: false, error: 'File not protected or not found' });

    const isMatch = await bcrypt.compare(password, file.password);
    if (!isMatch) return res.status(401).json({ success: false, error: 'Incorrect password' });

    return res.status(200).json({ success: true, message: 'Password verified' });
  } catch (error) {
    console.error('Guest file password verification error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

const getUserFiles = async (req, res) => {
  const { userId } = req.params;
  try {
    const files = await File.find({ createdBy: userId });
    if (!files.length) return res.status(404).json({ message: 'No files found' });
    return res.status(200).json(files);
  } catch (error) {
    console.error('List files error:', error);
    return res.status(500).json({ error: 'Error fetching user files' });
  }
};

export {
  uploadFiles,
  downloadFile,
  deleteFile,
  updateFileStatus,
  updateFileExpiry,
  updateFilePassword,
  searchFiles,
  showUserFiles,
  getFileDetails,
  generateShareShortenLink,
  sendLinkEmail,
  generateQR,
  getDownloadCount,
  resolveShareLink,
  verifyFilePassword,
  getUserFiles,
  updateAllFileExpiry,
  downloadInfo,
  uploadFilesGuest,
  guestDownloadInfo,
  verifyGuestFilePassword,
};
